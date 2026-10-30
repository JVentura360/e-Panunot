import test from 'node:test';
import assert from 'node:assert/strict';
import { readTheme, THEME_KEY } from './theme.js';

test('dark is the default for a new user or invalid preference', () => {
  for (const value of [null, 'dark', 'system', 'invalid']) {
    assert.equal(readTheme({ getItem: () => value }), 'dark');
  }
});
test('stored light preference is restored', () => {
  assert.equal(readTheme({ getItem: (key) => key === THEME_KEY ? 'light' : null }), 'light');
});
test('blocked storage falls back to dark', () => {
  assert.equal(readTheme({ getItem: () => { throw new Error('Storage blocked'); } }), 'dark');
});
