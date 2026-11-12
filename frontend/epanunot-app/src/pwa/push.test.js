import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers';

globalThis.window = { isSecureContext: true, Notification: {}, PushManager: {}, location: { origin: 'http://localhost:5173', href: 'http://localhost:5173/' }, dispatchEvent() {}, addEventListener() {} };
globalThis.document = { cookie: 'XSRF-TOKEN=test' };
globalThis.Notification = { permission: 'granted' };
globalThis.PushManager = { supportedContentEncodings: ['aes128gcm'] };
const { getPushState, enablePushNotifications } = await import('./push.js');
const { logout, clearApiCache, queryClient } = await import('../api/client.js');
queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, gcTime: Infinity } });
let registration;
let subscription;
let calls;

beforeEach(() => {
  clearApiCache();
  calls = [];
  subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/device', toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'key', auth: 'auth' } }; }, async unsubscribe() { calls.push('unsubscribe'); return true; } };
  registration = { active: { state: 'activated' }, pushManager: { async getSubscription() { return subscription; }, async subscribe() { calls.push('subscribe'); return subscription; } } };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { serviceWorker: { async register() { return registration; }, async getRegistration() { return registration; } } } });
  globalThis.fetch = async (url, options) => {
    url = new URL(url);
    calls.push({ path: url.pathname, body: options.body && JSON.parse(options.body) });
    return new Response(JSON.stringify(url.pathname.endsWith('public-key') ? { public_key: 'AQID' } : { subscribed: false }));
  };
});
afterEach(() => clearApiCache());

test('a browser subscription alone does not enable alerts for the current account', async () => {
  assert.equal((await getPushState()).enabled, false);
});

test('a confirmed account subscription enables alerts', async () => {
  globalThis.fetch = async (url, options) => {
    if (new URL(url).pathname.endsWith('/status')) {
      assert.deepEqual(JSON.parse(options.body), { endpoint: subscription.endpoint });
      return new Response(JSON.stringify({ subscribed: true }));
    }
    return new Response('{}');
  };
  assert.equal((await getPushState()).enabled, true);
});

test('failed server persistence can be retried using the existing browser subscription', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => new URL(url).pathname.endsWith('/push-subscriptions')
    ? new Response(JSON.stringify({ message: 'Unavailable' }), { status: 503 })
    : originalFetch(url, options);
  await assert.rejects(enablePushNotifications(), /Unavailable/);
  assert.equal((await getPushState()).enabled, false);
  globalThis.fetch = originalFetch;
  assert.equal((await enablePushNotifications()).enabled, true);
  assert.equal(calls.includes('subscribe'), false);
});

test('failed worker installation rejects without subscribing', async () => {
  const worker = new EventTarget();
  worker.state = 'redundant';
  registration.active = null;
  registration.installing = worker;
  await assert.rejects(enablePushNotifications(), /worker could not start/);
  assert.equal(calls.includes('subscribe'), false);
});

test('enabling waits for the push registration to activate', async () => {
  const worker = new EventTarget();
  worker.state = 'installing';
  registration.active = null;
  registration.installing = worker;
  registration.pushManager.getSubscription = async () => null;
  const enabling = enablePushNotifications();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.includes('subscribe'), false);
  worker.state = 'activated';
  registration.active = worker;
  worker.dispatchEvent(new Event('statechange'));
  assert.equal((await enabling).enabled, true);
  assert.equal(calls.includes('subscribe'), true);
});

test('logout unsubscribes the browser and passes its endpoint for server cleanup', async () => {
  await logout();
  assert.ok(calls.includes('unsubscribe'));
  assert.deepEqual(calls.find(call => call.path === '/logout').body, { push_endpoint: subscription.endpoint });
});

test('logout still requests server cleanup when browser unsubscribe fails', async () => {
  subscription.unsubscribe = async () => { throw new Error('push service unavailable'); };
  await logout();
  assert.deepEqual(calls.find(call => call.path === '/logout').body, { push_endpoint: subscription.endpoint });
});
