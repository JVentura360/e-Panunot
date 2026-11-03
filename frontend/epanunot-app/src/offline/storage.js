const DB_NAME = 'epanunot-offline-v1';
let connection;

export async function openOfflineStorage() {
  if (!connection) connection = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Offline storage is unavailable in this browser.'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('accounts', { keyPath: 'id' });
      request.result.createObjectStore('meta');
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close older app tabs to enable offline storage.'));
    request.onsuccess = () => {
      request.result.onversionchange = () => { request.result.close(); connection = null; };
      resolve(request.result);
    };
  });
  const db = await connection;
  const read = (store, key) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const request = tx.objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
  const write = (store, action) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    let result;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Offline changes could not be saved.'));
    tx.oncomplete = () => resolve(result);
    action(tx.objectStore(store), (value) => { result = value; }, tx, reject);
  });
  return {
    load: async (id) => { const record = await read('accounts', String(id)); return record?.closed ? null : record; },
    active: () => read('meta', 'active'),
    setActive: (id) => write('meta', (store) => { id == null ? store.delete('active') : store.put(String(id), 'active'); }),
    remove: (id) => write('accounts', (store, done, tx, reject) => {
      const request = store.get(String(id));
      request.onsuccess = () => {
        if (request.result?.outbox?.length) {
          tx.abort();
          reject(new Error('Another tab has saved changes. Sign in again and sync them before signing out.'));
          return;
        }
        store.put({ id: String(id), closed: true, user: null, snapshots: {}, outbox: [] });
        done(null);
      };
    }),
    update: (id, change, reopen = false) => write('accounts', (store, done, tx, reject) => {
      const request = store.get(String(id));
      request.onsuccess = () => {
        try {
          if (request.result?.closed && !reopen) throw new Error('This account signed out in another tab. Sign in again to continue.');
          const next = change(request.result ?? { id: String(id), user: null, snapshots: {}, outbox: [] });
          store.put(next);
          done(next);
        } catch (error) { tx.abort(); reject(error); }
      };
    }),
  };
}
