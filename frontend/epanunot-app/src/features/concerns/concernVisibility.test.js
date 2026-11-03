import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewConcern, canReplyToConcern, concernActions } from './concernVisibility.js';

test('only students can resolve or reopen; mayors can mark unresolved concerns in progress', () => {
  assert.deepEqual(concernActions({ status: 'open' }, 'student'), ['resolve']);
  assert.deepEqual(concernActions({ status: 'open' }, 'mayor'), ['in_progress']);
  assert.deepEqual(concernActions({ status: 'in_progress' }, 'mayor'), []);
  assert.deepEqual(concernActions({ status: 'resolved' }, 'mayor'), []);
  assert.deepEqual(concernActions({ status: 'resolved' }, 'student'), ['reopen']);
  assert.deepEqual(concernActions({ status: 'resolved', closedDueToRemoval: true }, 'student'), []);
});

test('resolved, closed, and removed conversations have no reply composer', () => {
  assert.equal(canReplyToConcern({ status: 'open' }), true);
  assert.equal(canReplyToConcern({ status: 'in_progress' }), true);
  assert.equal(canReplyToConcern({ status: 'resolved' }), false);
  assert.equal(canReplyToConcern({ status: 'closed' }), false);
  assert.equal(canReplyToConcern({ status: 'open', closedDueToRemoval: true }), false);
});

test('mayors retain legacy concerns from known block members without seeing other blocks', () => {
  const mayor = { id: 1, role: 'mayor', block_id: 4 };
  const members = new Set([1, 2]);
  assert.equal(canViewConcern({ studentId: 2 }, mayor, members), true);
  assert.equal(canViewConcern({ studentId: 3 }, mayor, members), false);
  assert.equal(canViewConcern({ studentId: 2, blockId: 9 }, mayor, members), false);
  assert.equal(canViewConcern({ studentId: 3, blockId: 4 }, mayor, members), true);
});

test('students retain only their own concern history across blocks and after withdrawal', () => {
  const student = { id: 2, role: 'student', block_id: 4 };
  assert.equal(canViewConcern({ studentId: 2, blockId: 9 }, student, new Set()), true);
  assert.equal(canViewConcern({ studentId: 3, blockId: 9 }, student, new Set()), false);
  assert.equal(canViewConcern({ studentId: 2, blockId: 9, closedDueToRemoval: true }, student, new Set()), false);
  assert.equal(canViewConcern({ studentId: 2 }, { ...student, block_id: null }, new Set()), false);
});
