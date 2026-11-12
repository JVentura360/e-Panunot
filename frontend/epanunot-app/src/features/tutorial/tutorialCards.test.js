import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tutorialCards } from './tutorialCards.js';

describe('tutorial cards', () => {
  for (const role of ['student', 'mayor']) it(role + ' cards are complete and unique', () => {
    const cards = tutorialCards[role];
    assert.ok(cards.length >= 3);
    assert.equal(new Set(cards.map((card) => card.id)).size, cards.length);
    for (const card of cards) {
      assert.ok(card.icon);
      assert.ok(card.title);
      assert.ok(card.body);
    }
  });
});