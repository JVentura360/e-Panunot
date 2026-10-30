import test from 'node:test';
import assert from 'node:assert/strict';
import { unfinishedFirst, validDeadline } from './taskListUtils.js';

test('new items lead open tasks and completed items stay at bottom without mutating input', () => {
  const items = [{ id: 'new' }, { id: 'done', done: true }, { id: 'older' }];
  assert.deepEqual(unfinishedFirst(items).map((item) => item.id), ['new', 'older', 'done']);
  assert.equal(items[1].id, 'done');
});
test('class tasks use external completion state', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(unfinishedFirst(items, (item) => item.id === 'a').map((item) => item.id), ['b', 'c', 'a']);
});
test('deadlines allow today and future dates and reject past or invalid dates', () => {
  assert.equal(validDeadline('2026-10-29', '2026-10-30'), false);
  assert.equal(validDeadline('2026-10-30', '2026-10-30'), true);
  assert.equal(validDeadline('2026-11-01', '2026-10-30'), true);
  assert.equal(validDeadline('', '2026-10-30'), false);
  assert.equal(validDeadline('2026-02-30', '2026-02-01'), false);
});

test('most recently completed class task moves to the very bottom', () => {
  const items = [{ id: 'newest' }, { id: 'older' }, { id: 'open' }];
  const completed = ['older', 'newest'];
  assert.deepEqual(unfinishedFirst(items, (item) => completed.includes(item.id), completed).map((item) => item.id), ['open', 'older', 'newest']);
});
