import assert from 'node:assert/strict';
import test from 'node:test';
import { canOpenOffline } from './policy.js';
test('offline navigation permits only task and calendar pages for cached student or mayor', () => {
  for (const role of ['student', 'mayor']) {
    assert.equal(canOpenOffline('/?task=1', role), true);
    assert.equal(canOpenOffline('/calendar#today', role), true);
    for (const path of ['/profile', '/concerns', '/block', '/join-block', '/admin', 'https://google.com/']) assert.equal(canOpenOffline(path, role), false);
  }
  assert.equal(canOpenOffline('/', 'admin'), false);
});
