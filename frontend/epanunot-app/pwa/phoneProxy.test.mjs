import test from 'node:test';
import assert from 'node:assert/strict';
import { phoneProxy, tunnelHostname } from './phoneProxy.mjs';

test('phone tunnel permits only its exact supplied Dev Tunnel hostname', () => {
  assert.equal(tunnelHostname('https://example-5173.asse.devtunnels.ms/'), 'example-5173.asse.devtunnels.ms');
  assert.equal(tunnelHostname('example-5173.asse.devtunnels.ms'), 'example-5173.asse.devtunnels.ms');
  assert.equal(tunnelHostname(''), null);
  assert.throws(() => tunnelHostname('https://example.com'), /Dev Tunnel/);
});

test('same-origin proxy forwards session endpoints locally and removes cookie domains', () => {
  const routes = phoneProxy();
  for (const path of ['/api/me', '/api/offline-sync', '/auth/development/accounts', '/auth/development/login', '/sanctum/csrf-cookie', '/logout']) {
    const key = Object.keys(routes).find(pattern => new RegExp(pattern).test(path));
    assert.ok(key, path);
    assert.equal(routes[key].target, 'http://127.0.0.1:8000');
    assert.equal(routes[key].cookieDomainRewrite, '');
  }
  for (const path of ['/', '/calendar', '/apiary', '/assets/index.js']) {
    assert.equal(Object.keys(routes).some(pattern => new RegExp(pattern).test(path)), false);
  }
});
