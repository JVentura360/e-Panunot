import test from 'node:test';
import assert from 'node:assert/strict';
import { deadlineDate, deadlineInput, deadlinePayload } from './deadline.js';

test('local deadline input round trips through UTC without losing the time', () => {
  const value = '2026-11-15T14:35';
  assert.equal(deadlineInput(deadlinePayload(value)), value);
  assert.equal(deadlineDate('2026-11-15 06:35:00').toISOString(), '2026-11-15T06:35:00.000Z');
});

test('date-only legacy tasks retain their end-of-day deadline', () => {
  assert.equal(deadlineInput('2026-11-15'), '2026-11-15T23:59');
  assert.throws(() => deadlinePayload('2026-11-15'), /date and time/);
});
