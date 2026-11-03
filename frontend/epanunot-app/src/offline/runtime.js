import { createOfflineEngine, OFFLINE_PATHS } from './engine.js';
import { openOfflineStorage } from './storage.js';

const listeners = new Set();
let state = Object.freeze({ online: typeof navigator === 'undefined' || navigator.onLine !== false,
  accountId: null, pending: 0, syncing: false, writing: false, updating: false, message: '', savedAt: null, available: false });
let engine;
let cache;
let optionsFor;
let transport;
let channel;
let connecting = false;
let restoring = false;
let sessionEpoch = 0;
let activation = Promise.resolve();
let loggingOut = false;
const writes = new Set();
const publish = (changes = {}) => {
  const record = engine?.record();
  state = Object.freeze({ ...state, accountId: record?.id ?? null, pending: record?.outbox.length ?? 0,
    syncing: engine?.syncing() ?? false, savedAt: record?.lastSavedAt ?? null, ...changes });
  listeners.forEach((listener) => listener());
};
const hydrate = () => {
  const record = engine?.record();
  if (!record || !cache) return;
  for (const path of OFFLINE_PATHS) {
    if (path === '/me' || record.snapshots[path] || path === '/personal-todos' && record.outbox.some((op) => op.kind === 'create_personal')) {
      cache.setQueryData(optionsFor(path).queryKey, engine.view(path));
    }
  }
};
const changed = () => { publish(); if (!restoring) hydrate(); };
export const getOfflineState = () => state;
export const subscribeOffline = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export const offlineRecord = () => engine?.record();
export const offlineView = (path) => engine?.view(path) ?? (path === '/me' ? null : { data: [] });
export const offlineOnly = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('offline:notice'));
  return Object.assign(new Error('You are in offline mode. This action requires an internet connection.'), { code: 'OFFLINE_ONLY' });
};
export function requireOnline() { if (!state.online) throw offlineOnly(); }
export function configureOfflineTransport(value) { transport = value; }
export function setOfflineConnectivity(online) { publish({ online }); }

export async function restoreOfflineFallback() {
  if (!engine || engine.record()) return;
  const epoch = sessionEpoch;
  restoring = true;
  try {
    await engine.restore();
    if (epoch !== sessionEpoch) { await engine.deactivate(); return; }
    hydrate();
  } finally { restoring = false; }
}

export async function initializeOffline(queryCache, queryOptions) {
  cache = queryCache;
  optionsFor = queryOptions;
  try {
    const storage = await openOfflineStorage();
    engine = createOfflineEngine({ storage, changed });
    publish({ available: true });
    if (!state.online) { restoring = true; await engine.restore(); restoring = false; hydrate(); }
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('epanunot-offline');
      channel.onmessage = async ({ data }) => {
        if (data?.kind === 'logout' && String(data.id) === state.accountId) {
          forgetOfflineIdentity();
          cache.clear();
          window.dispatchEvent(new Event('auth:expired'));
        } else if (data?.kind === 'changed' && String(data.id) === state.accountId) await engine.reload();
      };
    }
  } catch {
    publish({ available: false, message: 'Offline storage is unavailable. Keep this app online; changes cannot be saved offline.' });
  }
  window.addEventListener('offline', () => setOfflineConnectivity(false));
  window.addEventListener('online', () => { void reconnectOffline(); });
  window.setInterval(() => {
    if (document.visibilityState === 'visible' && navigator.onLine !== false && (!state.online || state.pending)) void reconnectOffline();
  }, 30000);
}

export async function activateOfflineAccount(user) {
  if (!engine || !user?.id) return;
  if (!['student', 'mayor'].includes(user.role)) { await engine.deactivate(); return; }
  const epoch = sessionEpoch;
  activation = activation.catch(() => {}).then(async () => {
    if (epoch !== sessionEpoch) return;
    try {
      restoring = true;
      await engine.activate(user);
      if (epoch !== sessionEpoch) { await engine.deactivate(); return; }
      hydrate();
    } catch { publish({ message: 'Your data could not be saved for offline use. Check available device storage.' }); }
    finally { restoring = false; }
  });
  await activation;
}

export async function cacheOfflineRead(path, data, expectedId) {
  if (!engine || !state.available) return data;
  try {
    if (path === '/me' && data?.data) await activateOfflineAccount(data.data);
    else await engine.cache(path, data, expectedId);
    return state.accountId && OFFLINE_PATHS.includes(path) ? engine.view(path) : data;
  } catch { publish({ message: 'Offline data could not be saved. Check available device storage.' }); return data; }
}

export function forgetOfflineIdentity() {
  sessionEpoch++;
  if (engine) void engine.deactivate().catch(() => {});
}

async function save(change) {
  if (loggingOut) throw new Error('Sign out is in progress. Please wait before changing tasks.');
  if (state.updating) throw new Error('The app is updating. Please wait before changing tasks.');
  if (!engine || !state.available || !state.accountId) throw new Error('Offline storage is unavailable. Connect and sign in to save your tasks.');
  publish({ writing: true });
  const pending = change(engine);
  writes.add(pending);
  try {
    await pending;
    hydrate();
    channel?.postMessage({ kind: 'changed', id: state.accountId });
    if (state.online) void syncOffline().catch(() => {});
  } finally { writes.delete(pending); publish({ writing: writes.size > 0 }); }
}
export const createOfflinePersonal = (values) => save((manager) => manager.createPersonal(values));
export const completeOfflineTask = (id, personal, done) => save((manager) => manager.complete(id, personal, done));

export async function syncOffline() {
  if (!engine || !state.online || !state.accountId || !transport || engine.syncing()) return;
  try {
    await engine.flush(transport);
    hydrate();
    publish({ message: engine.record()?.notice ?? '' });
    channel?.postMessage({ kind: 'changed', id: state.accountId });
  } catch (error) {
    if (error.accountChanged) { forgetOfflineIdentity(); cache?.clear(); window.dispatchEvent(new Event('auth:expired')); }
    if (error.status === 0) setOfflineConnectivity(false);
    if (error.status !== 401) publish({ message: error.message || 'Saved changes will sync when the connection returns.' });
    throw error;
  }
}

export async function reconnectOffline() {
  if (connecting || !transport || navigator.onLine === false) return;
  connecting = true;
  try {
    const identity = await transport.verify();
    if (state.accountId && String(identity.id) !== state.accountId) {
      forgetOfflineIdentity(); cache?.clear(); window.dispatchEvent(new Event('auth:expired')); return;
    }
    setOfflineConnectivity(true);
    await activateOfflineAccount(identity);
    await syncOffline();
    await cache?.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'api', refetchType: 'active' });
  } catch (error) {
    if (error.status === 0) setOfflineConnectivity(false);
  } finally { connecting = false; }
}

export async function logoutOfflineAccount() {
  loggingOut = true;
  try {
    await Promise.all([...writes]);
    if (engine?.record()?.outbox.length) {
      await syncOffline();
      if (engine?.record()?.outbox.length) throw new Error('Reconnect and sync your saved changes before signing out.');
    }
  } catch (error) { loggingOut = false; throw error; }
}
export const finishOfflineLogout = () => { loggingOut = false; };
export async function purgeOfflineAccount() {
  const id = state.accountId;
  await engine?.deactivate({ purge: true });
  channel?.postMessage({ kind: 'logout', id });
}
export async function prepareOfflineUpdate() { publish({ updating: true }); await Promise.all([...writes]); }
export const finishOfflineUpdate = () => publish({ updating: false });
export async function dismissOfflineMessage() { await engine?.clearNotice(); publish({ message: '' }); }
