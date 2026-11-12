import { describe, expect, it } from 'vitest';
import { tutorialCards } from './tutorialCards.js';

describe('tutorial cards', () => {
  it.each(['student', 'mayor'])('%s cards are complete and unique', (role) => {
    const cards = tutorialCards[role];
    expect(cards.length).toBeGreaterThanOrEqual(3);
    expect(new Set(cards.map((card) => card.id)).size).toBe(cards.length);
    for (const card of cards) {
      expect(card.icon).toBeTruthy();
      expect(card.title).toBeTruthy();
      expect(card.body).toBeTruthy();
    }
  });
});