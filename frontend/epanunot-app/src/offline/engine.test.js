import test from 'node:test';
import assert from 'node:assert/strict';
import { createOfflineEngine } from './engine.js';

function setup() {
  const accounts = new Map();
  let active;
  let id = 0;
  const storage = { load: async (key) => structuredClone(accounts.get(String(key)) ?? null), active: async () => active,
    setActive: async (key) => { active = key; }, remove: async (key) => accounts.delete(String(key)),
    update: async (key, change) => { const next = change(structuredClone(accounts.get(String(key)) ?? { id: String(key), snapshots: {}, outbox: [] })); accounts.set(String(key), next); return structuredClone(next); } };
  const create = () => createOfflineEngine({ storage, uuid: () => `uuid-${++id}`, now: () => '2026-11-03T10:00:00Z' });
  return { storage, create };
}

test('offline completion coalesces latest intent, survives restart, and remains account isolated', async () => {
  const { create } = setup();
  const engine = create();
  await engine.activate({ id: 4, role: 'student' });
  await engine.cache('/tasks', { data: [{ id: 2, completed_at: null, completion_revision: 7 }] });
  await engine.complete(2, false, true);
  assert.equal(engine.view('/tasks').data[0]._offline_pending, true);
  assert.equal(engine.record().outbox[0].expected_revision, 7);
  const restarted = create();
  await restarted.restore();
  assert.equal(Boolean(restarted.view('/tasks').data[0].completed_at), true);
  await restarted.complete(2, false, false);
  assert.equal(restarted.record().outbox.length, 0);
  await restarted.activate({ id: 9, role: 'student' });
  assert.deepEqual(restarted.view('/tasks'), { data: [] });
});

test('offline personal creation and completion share one durable create with a stable client identity', async () => {
  const { create } = setup();
  const engine = create();
  await engine.activate({ id: 4, role: 'mayor' });
  await engine.createPersonal({ title: 'Read notes', due_date: '2026-11-04', due_at: '2026-11-04T06:30:00Z' });
  const row = engine.view('/personal-todos').data[0];
  assert.equal(row.due_at, '2026-11-04T06:30:00Z');
  assert.equal(engine.record().outbox[0].due_at, row.due_at);
  await engine.complete(row.id, true, true);
  assert.equal(engine.record().outbox.length, 1);
  assert.equal(engine.record().outbox[0].client_id, row.client_id);
  assert.equal(engine.record().outbox[0].done, true);
  assert.equal(engine.view('/personal-todos').data[0].is_done, true);
});

test('transport failure preserves queued work; retry acknowledgement refreshes authoritative rows once', async () => {
  const { create } = setup();
  const engine = create();
  await engine.activate({ id: 4, role: 'student' });
  await engine.createPersonal({ title: 'Work', due_date: '2026-11-04' });
  const operation = engine.record().outbox[0];
  const transport = { verify: async () => ({ id: 4 }), upload: async () => ({ results: [{ operation_id: operation.operation_id, status: 'applied' }] }),
    lists: async () => { throw new Error('Connection lost after upload'); } };
  await assert.rejects(engine.flush(transport));
  assert.equal(engine.record().outbox.length, 1);
  transport.lists = async () => ({ tasks: { data: [] }, personal: { data: [{ id: 21, title: 'Work', client_id: operation.client_id, revision: 0 }] } });
  await engine.flush(transport);
  assert.equal(engine.record().outbox.length, 0);
  assert.equal(engine.view('/personal-todos').data.length, 1);
  assert.equal(engine.view('/personal-todos').data[0].id, 21);
});

test('conflicts and revoked access use server snapshots, and a changed account never uploads', async () => {
  const { create } = setup();
  const engine = create();
  await engine.activate({ id: 4, role: 'student' });
  await engine.cache('/tasks', { data: [{ id: 2, completed_at: null, completion_revision: 0 }] });
  await engine.complete(2, false, true);
  await assert.rejects(engine.flush({ verify: async () => ({ id: 9 }), upload: async () => assert.fail('Wrong account upload') }));
  assert.equal(engine.record().outbox.length, 1);
  const operation = engine.record().outbox[0];
  await engine.flush({ verify: async () => ({ id: 4 }), upload: async () => ({ results: [{ operation_id: operation.operation_id, status: 'rejected', message: 'Access removed' }] }),
    lists: async () => ({ tasks: { data: [] }, personal: { data: [] } }) });
  assert.equal(engine.record().outbox.length, 0);
  assert.deepEqual(engine.view('/tasks').data, []);
  assert.match(engine.record().notice, /Access removed/);
});

test('uncertain completion uploads remain immutable across restart and cannot be undone against stale data', async () => {
  const { create } = setup();
  const engine = create();
  await engine.activate({ id: 4, role: 'student' });
  await engine.cache('/tasks', { data: [{ id: 2, completed_at: null, completion_revision: 0 }] });
  await engine.complete(2, false, true);
  const operationId = engine.record().outbox[0].operation_id;
  await assert.rejects(engine.flush({ verify: async () => ({ id: 4 }),
    upload: async () => ({ results: [{ operation_id: operationId, status: 'applied' }] }),
    lists: async () => { throw new Error('Refresh failed after server committed'); } }));
  const restarted = create();
  await restarted.restore();
  await assert.rejects(restarted.complete(2, false, false), /Reconnect to finish syncing/);
  assert.equal(restarted.record().outbox[0].operation_id, operationId);
  assert.equal(restarted.record().outbox[0].done, true);
  await restarted.flush({ verify: async () => ({ id: 4 }),
    upload: async (_id, operations) => {
      assert.equal(operations[0].operation_id, operationId);
      return { results: [{ operation_id: operationId, status: 'applied' }] };
    }, lists: async () => ({ tasks: { data: [{ id: 2, completed_at: '2026-11-03T10:00:00Z', completion_revision: 1 }] }, personal: { data: [] } }) });
  await restarted.complete(2, false, false);
  assert.equal(restarted.record().outbox[0].done, false);
  assert.equal(restarted.record().outbox[0].expected_revision, 1);
});

test('uncertain personal creation stays immutable while unrelated tasks remain editable', async () => {
  const { create } = setup();
  const engine = create();
  await engine.activate({ id: 4, role: 'student' });
  await engine.cache('/tasks', { data: [{ id: 2, completed_at: null }] });
  await engine.createPersonal({ title: 'Read', due_date: '2026-11-04' });
  const row = engine.view('/personal-todos').data[0];
  await assert.rejects(engine.flush({ verify: async () => ({ id: 4 }), upload: async () => { throw new Error('Response lost'); } }));
  await assert.rejects(engine.complete(row.id, true, true), /Reconnect to finish syncing/);
  assert.equal(engine.record().outbox[0].done, false);
  await engine.complete(2, false, true);
  assert.equal(engine.record().outbox.length, 2);
});

test('upload never starts if its attempted marker cannot be saved durably', async () => {
  const { create, storage } = setup();
  const engine = create();
  await engine.activate({ id: 4, role: 'student' });
  await engine.createPersonal({ title: 'Read', due_date: '2026-11-04' });
  storage.update = async () => { throw new Error('Storage full'); };
  await assert.rejects(engine.flush({ verify: async () => ({ id: 4 }), upload: async () => assert.fail('Unsafe upload') }), /Storage full/);
  assert.equal(engine.record().outbox.length, 1);
});

test('a delayed reload cannot restore a signed-out identity or overwrite a newer account', async () => {
  for (const replacement of [null, { id: 9, role: 'student' }]) {
    const { create, storage } = setup();
    const engine = create();
    await engine.activate({ id: 4, role: 'student' });
    const oldRecord = structuredClone(engine.record());
    let finish;
    storage.load = async () => new Promise((resolve) => { finish = resolve; });
    const reload = engine.reload();
    await engine.deactivate();
    if (replacement) await engine.activate(replacement);
    finish(oldRecord);
    await reload;
    assert.equal(engine.record()?.id ?? null, replacement ? '9' : null);
  }
});
