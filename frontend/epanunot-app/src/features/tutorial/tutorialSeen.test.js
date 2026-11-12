import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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
    assert.equal(shouldShowTutorial(storage, student), true);
    markTutorialSeen(storage, student);
    assert.equal(shouldShowTutorial(storage, student), false);
  });

  it('shows the mayor tutorial after a student becomes a mayor', () => {
    const storage = memoryStorage();
    markTutorialSeen(storage, student);
    assert.equal(shouldShowTutorial(storage, mayor), true);
    markTutorialSeen(storage, mayor);
    assert.equal(shouldShowTutorial(storage, mayor), false);
  });

  it('keeps accounts on the same device separate', () => {
    const storage = memoryStorage();
    markTutorialSeen(storage, student);
    assert.equal(shouldShowTutorial(storage, { id: 7, role: 'student' }), true);
  });

  it('never applies to admins or missing users', () => {
    const storage = memoryStorage();
    assert.equal(tutorialKey({ id: 1, role: 'admin' }), null);
    assert.equal(shouldShowTutorial(storage, { id: 1, role: 'admin' }), false);
    assert.equal(shouldShowTutorial(storage, null), false);
    markTutorialSeen(storage, { id: 1, role: 'admin' });
    assert.equal(storage.getItem('epanunot-tutorial:1:admin'), null);
  });

  it('does not throw or nag when storage is unavailable', () => {
    assert.equal(shouldShowTutorial(brokenStorage, student), false);
    assert.doesNotThrow(() => markTutorialSeen(brokenStorage, student));
  });
});