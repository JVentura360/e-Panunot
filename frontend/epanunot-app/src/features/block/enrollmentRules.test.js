import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationEligibility, isRegularStudent, mayWithdrawSubjects, blockNavigation, enrollmentReadiness, canUseConcerns } from './enrollmentRules.js';

test('concerns require primary membership even when a student has other subject enrollments', () => {
  assert.equal(canUseConcerns({ role: 'student', enrollment_count: 2 }), false);
  assert.equal(canUseConcerns({ role: 'student', block_id: 4, enrollment_count: 0 }), true);
  assert.equal(canUseConcerns({ role: 'mayor', block_id: 4 }), true);
});

test('initial joining depends on membership lookup rather than a failed subject ledger', () => {
  assert.equal(enrollmentReadiness(false, {}, { error: new Error('Ledger unavailable') }).unavailable, false);
  const error = new Error('Membership unavailable');
  assert.equal(enrollmentReadiness(false, { error }, {}).error, error);
  assert.equal(enrollmentReadiness(true, {}, { error }).unavailable, true);
});

test('navigation follows primary membership even when subject ledger is empty', () => {
  assert.equal(blockNavigation({ role: 'student', enrollment_count: 2 }).label, 'Join a Block');
  assert.equal(blockNavigation({ role: 'student', block_id: 4, enrollment_count: 0 }).label, 'My Ledger');
  assert.equal(blockNavigation({ role: 'student', block_id: 4, student_type: 'irregular' }).mobileLabel, 'Ledger');
});

test('pending join holds the ledger and blocks mayor application until approved or cancelled', () => {
  const user = { role: 'student', pending_join_request: { id: 1, status: 'pending' } };
  assert.equal(blockNavigation(user).label, 'My Ledger');
  assert.equal(blockNavigation(user).joined, false);
  assert.equal(applicationEligibility(user).allowed, false);
  assert.equal(canUseConcerns(user), false);
});

test('only an unjoined regular or unclassified student may apply as mayor', () => {
  assert.equal(applicationEligibility({ role: 'student', student_type: 'regular' }).allowed, true);
  assert.equal(applicationEligibility({ role: 'student' }).allowed, true);
  for (const user of [{ role: 'student', block_id: 4 }, { role: 'student', enrollment_count: 1 },
    { role: 'student', enrolled_block_ids: [4] }, { role: 'student', student_type: 'irregular' }, { role: 'mayor' }, { role: 'admin' }]) {
    const result = applicationEligibility(user);
    assert.equal(result.allowed, false);
    assert.ok(result.reason);
  }
});

test('server eligibility denial remains authoritative', () => {
  assert.deepEqual(applicationEligibility({ role: 'student', can_apply_as_mayor: false, mayor_application_disabled_reason: 'Already joined.' }),
    { allowed: false, reason: 'Already joined.' });
});

test('students and mayors may withdraw their enrolled subjects', () => {
  assert.equal(isRegularStudent({ role: 'mayor' }), true);
  assert.equal(isRegularStudent({ role: 'student', student_type: 'regular' }), true);
  assert.equal(mayWithdrawSubjects({ role: 'student', student_type: 'regular' }), true);
  assert.equal(mayWithdrawSubjects({ role: 'mayor', student_type: 'regular' }), true);
  assert.equal(mayWithdrawSubjects({ role: 'student', student_type: 'irregular' }), true);
});
