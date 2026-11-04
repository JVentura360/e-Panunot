import test from 'node:test';
import assert from 'node:assert/strict';
import quotes from '../../data/dashboardQuotes.json' with { type: 'json' };
import { dailyQuote } from './dailyQuote.js';

test('the collection contains 1,000 unique short phrases and stable IDs', () => {
  assert.equal(quotes.length, 1000);
  assert.equal(new Set(quotes.map((quote) => quote.text)).size, 1000);
  quotes.forEach((quote, index) => {
    assert.equal(quote.id, index + 1);
    assert.ok(quote.text.trim().length > 0 && quote.text.length <= 140);
    assert.ok(quote.category);
  });
});

test('the same account sees the same phrase throughout a local day', () => {
  assert.equal(dailyQuote(42, new Date(2026, 10, 5, 0)).id,
    dailyQuote('42', new Date(2026, 10, 5, 23, 59)).id);
});

test('daily rotation covers every phrase before repeating', () => {
  const start = new Date(2026, 10, 5, 12);
  const ids = Array.from({ length: 1000 }, (_, offset) =>
    dailyQuote(42, new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset, 12)).id);
  assert.equal(new Set(ids).size, 1000);
  assert.equal(dailyQuote(42, new Date(2026, 10, 1005, 12)).id, ids[0]);
});

test('daily rotation advances across year and leap-day boundaries', () => {
  for (const [before, after] of [
    [new Date(2026, 11, 31), new Date(2027, 0, 1)],
    [new Date(2028, 1, 28), new Date(2028, 1, 29)],
    [new Date(2028, 1, 29), new Date(2028, 2, 1)],
  ]) assert.notEqual(dailyQuote(42, before).id, dailyQuote(42, after).id);
});
