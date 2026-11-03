import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as flush } from 'node:timers/promises';
import { createSyncSession, startClientSync, syncPaths } from './clientSync.js';

test('another device changes shared data; only changed domains refresh, with no work for unchanged versions', async () => {
  let snapshot = { account_id: 4, access: 'a', tasks: '1', personal: '1' };
  const changes = [];
  const session = createSyncSession({ accountId: 4, read: async () => ({ ...snapshot }), refresh: async (domains) => changes.push(domains), available: () => true });
  await session.check();
  await session.check();
  assert.deepEqual(changes, []);
  snapshot = { ...snapshot, tasks: '2' };
  await session.check();
  assert.deepEqual(changes, [['tasks']]);
  assert.deepEqual(syncPaths(['tasks']), ['/tasks', '/calendar']);
  assert.equal(syncPaths(['access']), null);
});

test('hidden or offline sessions send no requests, and logged-out sessions ignore late responses', async () => {
  let available = false;
  let reads = 0;
  let finish;
  const changes = [];
  const session = createSyncSession({ accountId: 4, read: async () => { reads++; return new Promise((resolve) => { finish = resolve; }); },
    refresh: async (domains) => changes.push(domains), available: () => available });
  await session.check();
  assert.equal(reads, 0);
  available = true;
  const pending = session.check();
  await session.check();
  assert.equal(reads, 1);
  session.stop();
  finish({ account_id: 4, tasks: 'old-account' });
  await pending;
  await session.check();
  assert.equal(reads, 1);
  assert.deepEqual(changes, []);
});

test('a different account in the browser session clears the session instead of merging account data', async () => {
  let expired = 0;
  const session = createSyncSession({ accountId: 4, read: async () => ({ account_id: 9 }), available: () => true,
    refresh: async () => assert.fail('Must not merge another account'), accountChanged: () => expired++ });
  await session.check();
  await session.check();
  assert.equal(expired, 1);
});

test('polling backs off on failure, resumes on reconnect, and removes timers/listeners on cleanup', async () => {
  const timers = new Map();
  const listeners = new Map();
  let clock = 0;
  let calls = 0;
  let timerId = 0;
  const target = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name) => listeners.delete(name) };
  const stop = startClientSync({ accountId: 4, read: async () => { calls++; if (calls === 1) throw new Error('Offline'); return { account_id: 4, tasks: '1' }; },
    refresh: async () => {}, available: () => true, now: () => clock, windowTarget: target, documentTarget: target,
    setTimer: (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; }, clearTimer: (id) => timers.delete(id) });
  await flush();
  assert.equal([...timers.values()][0].delay, 60000);
  clock = 16000;
  listeners.get('online')();
  await flush();
  assert.equal(calls, 2);
  assert.equal([...timers.values()][0].delay, 30000);
  listeners.get('focus')();
  assert.equal(calls, 2);
  stop();
  assert.equal(timers.size, 0);
  assert.equal(listeners.size, 0);
});

test('hiding the tab during a check defers changed-data refresh until the next visible check', async () => {
  let visible = true;
  let finish;
  let pending = false;
  let version = '1';
  const changes = [];
  const session = createSyncSession({ accountId: 4, available: () => visible,
    read: async () => pending ? new Promise((resolve) => { finish = resolve; }) : { account_id: 4, tasks: version },
    refresh: async (domains) => changes.push(domains) });
  await session.check();
  pending = true;
  const request = session.check();
  visible = false;
  finish({ account_id: 4, tasks: '2' });
  await request;
  assert.deepEqual(changes, []);
  visible = true;
  pending = false;
  version = '2';
  await session.check();
  assert.deepEqual(changes, [['tasks']]);
});
