import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleClassTasks } from './taskVisibility.js';

test('irregular students see matching subjects and block-wide tasks across enrolled blocks', () => {
  const store = {
    'block:4': [{ id: 'database', subjectId: 10 }, { id: 'hidden', subjectId: 11 }, { id: 'general' }],
    'block:9': [{ id: 'sia', subjectId: 20 }, { id: 'other', subjectId: 10 }],
    'block:99': [{ id: 'private' }],
  };
  const user = { id: 1, email: 'student@example.test', block_id: null };
  const enrolled = [{ block_id: 4, subject_id: 10, name: 'Database Systems' }, { block_id: 9, subject_id: 20, name: 'Systems Integration' }];
  assert.deepEqual(visibleClassTasks(store, user, enrolled).map((task) => task.id), ['database', 'general', 'sia']);
  assert.deepEqual(visibleClassTasks(store, user, enrolled.slice(1)).map((task) => task.id), ['sia']);
  assert.deepEqual(visibleClassTasks(store, user, []), []);
});

test('existing memberships preserve their tasks and same-block enrollments do not duplicate them', () => {
  const user = { id: 1, block_id: 4 };
  const store = { 'block:4': [{ id: 'legacy', subject: 'Database Systems' }] };
  assert.equal(visibleClassTasks(store, user, [{ block_id: 4, subject_id: 10 }]).length, 1);
});

test('legacy named tasks only match the enrolled subject rather than leaking another subject', () => {
  const user = { id: 1 };
  const store = { 'block:4': [{ id: 'right', subject: 'Database Systems' }, { id: 'wrong', subject: 'Operating Systems' }, { id: 'general', subject: 'Other' }] };
  assert.deepEqual(visibleClassTasks(store, user, [{ block_id: 4, subject_id: 10, name: 'Database Systems' }]).map((task) => task.id), ['right', 'general']);
});
