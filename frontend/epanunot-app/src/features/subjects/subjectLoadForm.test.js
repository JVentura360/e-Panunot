import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSubjectRows, subjectRowsError, subjectPayload, scopeKey, proposalForScope } from './subjectLoadForm.js';

test('subject proposal rows require complete distinct codes and full names', () => {
  assert.ok(subjectRowsError([]));
  assert.ok(subjectRowsError([{ code: 'ITE301', name: '' }]));
  assert.match(subjectRowsError([{ code: 'ITE301', name: 'Database Systems' }, { code: ' ite301 ', name: 'Database Systems' }]), /ITE301 appears more than once/);
  assert.equal(subjectRowsError([{ code: 'ITE301', name: 'fundamentals of database systems' }]), '');
});

test('payload drops UI row keys and retains names for server normalization', () => {
  assert.deepEqual(subjectPayload([{ key: 'local-only', code: ' ite301 ', name: 'fundamentals of database systems' }]),
    [{ code: 'ite301', name: 'fundamentals of database systems' }]);
  assert.throws(() => subjectPayload([{ code: '', name: 'Database Systems' }]));
});

test('changing scope cannot reuse a proposal from a previous program or year', () => {
  const draft = { scope: scopeKey('ITE', 3), rows: [{ code: 'ITE301', name: 'Database Systems' }] };
  assert.deepEqual(proposalForScope(draft, scopeKey('ite', 3)), draft.rows);
  assert.deepEqual(proposalForScope(draft, scopeKey('ITE', 2)), []);
  assert.deepEqual(proposalForScope(draft, scopeKey('BSA', 3)), []);
});

test('admin drafts preserve subject identity for edits and explicitly allow an empty load', () => {
  const rows = makeSubjectRows([{ id: 7, code: 'ITE301', name: 'Database Systems' }]);
  rows[0].code = 'ITE302';
  assert.deepEqual(subjectPayload(rows, { includeIds: true }), [{ id: 7, code: 'ITE302', name: 'Database Systems' }]);
  assert.deepEqual(subjectPayload(rows), [{ code: 'ITE302', name: 'Database Systems' }]);
  assert.deepEqual(makeSubjectRows([], { allowEmpty: true }), []);
  assert.deepEqual(subjectPayload([], { includeIds: true, allowEmpty: true }), []);
  assert.throws(() => subjectPayload([]));
});
