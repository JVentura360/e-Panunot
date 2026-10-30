import test from 'node:test';
import assert from 'node:assert/strict';
import { readTasks, saveTasks } from './taskStorage.js';

test('tasks, private lists and individual completion survive storage roundtrip', () => {
  let raw;
  const storage = { getItem: () => raw, setItem: (_key, value) => { raw = value; } };
  const data = { 'block:one': [{ id: 'a', title: 'Assignment', date: '2026-11-01' }], 'personal:student': [], 'completed:student': { a: true }, 'completed:mayor': { a: false } };
  saveTasks(storage, data);
  assert.deepEqual(readTasks(storage), data);
});

test('blocked storage retains successive in-memory changes', () => {
  const storage = { setItem: () => { throw new Error('blocked'); } };
  let data = saveTasks(storage, { 'personal:a': [] });
  data = saveTasks(storage, { ...data, 'personal:b': [] });
  assert.deepEqual(data, { 'personal:a': [], 'personal:b': [] });
});

test('corrupt, unavailable and structurally invalid storage safely reset', () => {
  for (const raw of ['null', '{', '[]', '{"block:one":{}}', '{"completed:a":null}', '{"block:one":[null]}']) {
    assert.deepEqual(readTasks({ getItem: () => raw }), {});
  }
  assert.deepEqual(readTasks({ getItem: () => { throw new Error('blocked'); } }), {});
});
