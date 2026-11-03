import test from 'node:test';
import assert from 'node:assert/strict';
import { openOfflineStorage } from './storage.js';

async function fixture(record) {
  const originalIndexedDB = globalThis.indexedDB;
  let saved = structuredClone(record);
  const db = { close() {}, transaction() {
    let aborted = false;
    const tx = { objectStore: () => ({ get() {
      const request = { result: structuredClone(saved) };
      queueMicrotask(() => { request.onsuccess(); queueMicrotask(() => { if (!aborted) tx.oncomplete?.(); }); });
      return request;
    }, put(value) { saved = structuredClone(value); } }), abort() { aborted = true; queueMicrotask(() => tx.onabort()); } };
    return tx;
  } };
  globalThis.indexedDB = { open() {
    const request = { result: db };
    queueMicrotask(() => request.onsuccess());
    return request;
  } };
  const storage = await openOfflineStorage();
  return { storage, saved: () => saved, cleanup() { db.onversionchange(); globalThis.indexedDB = originalIndexedDB; } };
}

test('transaction abort preserves the actionable error from an attempted task edit', async () => {
  const f = await fixture({ id: '4', snapshots: {}, outbox: [] });
  try {
    const error = new Error('Reconnect to finish syncing this task before changing it again.');
    await assert.rejects(f.storage.update(4, () => { throw error; }), (received) => received === error);
  } finally { f.cleanup(); }
});

test('logout atomically refuses to purge another tab pending work', async () => {
  const f = await fixture({ id: '4', snapshots: {}, outbox: [{ operation_id: 'pending' }] });
  try {
    await assert.rejects(f.storage.remove(4), /Another tab has saved changes/);
    assert.equal(f.saved().outbox.length, 1);
  } finally { f.cleanup(); }
});

test('logout clears snapshots and rejects late tab writes until verified activation', async () => {
  const f = await fixture({ id: '4', user: { name: 'Private' }, snapshots: { '/tasks': { data: [1] } }, outbox: [] });
  try {
    await f.storage.remove(4);
    assert.equal(await f.storage.load(4), null);
    assert.deepEqual(f.saved().snapshots, {});
    await assert.rejects(f.storage.update(4, old => ({ ...old, outbox: [1] })), /signed out in another tab/);
    await f.storage.update(4, old => ({ ...old, closed: false, user: { id: 4 } }), true);
    assert.equal((await f.storage.load(4)).user.id, 4);
  } finally { f.cleanup(); }
});
