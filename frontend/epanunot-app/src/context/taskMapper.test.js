import test from 'node:test';
import assert from 'node:assert/strict';
import { toClassTask, toPersonalTask } from './taskMapper.js';

test('unsynced personal rows retain their local identity, completion, and pending status', () => {
  const task = toPersonalTask({ id: 'offline:local-id', title: 'Read notes', due_date: '2026-11-05', is_done: true, _offline_pending: true });
  assert.equal(task.id, 'p-offline:local-id');
  assert.equal(task.rawId, 'offline:local-id');
  assert.equal(task.done, true);
  assert.equal(task.pendingSync, true);
  assert.equal(task.date, '2026-11-05');
});

test('class completion overlays expose pending status without changing assignment metadata', () => {
  const task = toClassTask({ id: 21, title: 'Report', due_date: '2026-11-05 23:59:00', completed_at: '2026-11-03T10:00:00Z',
    subject_id: 9, subject: { code: 'SIA', name: 'Integration' }, created_by: { name: 'Mayor' }, _offline_pending: true });
  assert.equal(task.done, true);
  assert.equal(task.pendingSync, true);
  assert.equal(task.subjectId, 9);
  assert.equal(task.by, 'Mayor');
  assert.equal(task.subject, 'SIA — Integration');
});

test('authoritative rows clear pending status for both task types', () => {
  assert.equal(toPersonalTask({ id: 3, title: 'Read', due_date: '2026-11-05', is_done: false }).pendingSync, false);
  assert.equal(toClassTask({ id: 4, title: 'Report', due_date: '2026-11-05', completed_at: null }).pendingSync, false);
});
