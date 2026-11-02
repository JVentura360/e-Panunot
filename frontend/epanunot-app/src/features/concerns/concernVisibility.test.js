import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewConcern } from './concernVisibility.js';

test('mayors retain legacy concerns from known block members without seeing other blocks', () => {
  const mayor = { id: 1, role: 'mayor', block_id: 4 };
  const members = new Set([1, 2]);
  assert.equal(canViewConcern({ studentId: 2 }, mayor, members), true);
  assert.equal(canViewConcern({ studentId: 3 }, mayor, members), false);
  assert.equal(canViewConcern({ studentId: 2, blockId: 9 }, mayor, members), false);
  assert.equal(canViewConcern({ studentId: 3, blockId: 4 }, mayor, members), true);
});

test('students retain only their own concern history across blocks and after withdrawal', () => {
  const student = { id: 2, role: 'student' };
  assert.equal(canViewConcern({ studentId: 2, blockId: 9 }, student, new Set()), true);
  assert.equal(canViewConcern({ studentId: 3, blockId: 9 }, student, new Set()), false);
});
