import { describe, expect, it } from 'vitest';
import { markTutorialSeen, shouldShowTutorial, tutorialKey } from './tutorialSeen.js';

const memoryStorage = () => {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)) };
};
const brokenStorage = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
};

const student = { id: 42, role: 'student' };
const mayor = { id: 42, role: 'mayor' };

describe('tutorial seen flag', () => {
  it('shows once, then never again for the same account and role', () => {
    const storage = memoryStorage();
    expect(shouldShowTutorial(storage, student)).toBe(true);
    markTutorialSeen(storage, student);
    expect(shouldShowTutorial(storage, student)).toBe(false);
  });

  it('shows the mayor tutorial after a student becomes a mayor', () => {
    const storage = memoryStorage();
    markTutorialSeen(storage, student);
    expect(shouldShowTutorial(storage, mayor)).toBe(true);
    markTutorialSeen(storage, mayor);
    expect(shouldShowTutorial(storage, mayor)).toBe(false);
  });

  it('keeps accounts on the same device separate', () => {
    const storage = memoryStorage();
    markTutorialSeen(storage, student);
    expect(shouldShowTutorial(storage, { id: 7, role: 'student' })).toBe(true);
  });

  it('never applies to admins or missing users', () => {
    const storage = memoryStorage();
    expect(tutorialKey({ id: 1, role: 'admin' })).toBeNull();
    expect(shouldShowTutorial(storage, { id: 1, role: 'admin' })).toBe(false);
    expect(shouldShowTutorial(storage, null)).toBe(false);
    markTutorialSeen(storage, { id: 1, role: 'admin' });
    expect(storage.getItem('epanunot-tutorial:1:admin')).toBeNull();
  });

  it('does not throw or nag when storage is unavailable', () => {
    expect(shouldShowTutorial(brokenStorage, student)).toBe(false);
    expect(() => markTutorialSeen(brokenStorage, student)).not.toThrow();
  });
});