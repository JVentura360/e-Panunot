import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = { location: { origin: 'http://localhost:5173' }, dispatchEvent: () => {} };
globalThis.document = { cookie: 'XSRF-TOKEN=encoded%3Dcsrf' };

const { api, logout, googleLoginUrl, developmentAccounts, loginAsDevelopmentAccount } = await import('./client.js');

test('session requests include cookies without bearer credentials', async () => {
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ data: { id: 1 } }));
  };
  assert.deepEqual(await api('/me'), { data: { id: 1 } });
  assert.equal(request.url.href, 'http://localhost:8000/api/me');
  assert.equal(request.options.credentials, 'include');
  assert.equal(request.options.headers.Authorization, undefined);
  assert.equal(googleLoginUrl, 'http://localhost:8000/auth/google/redirect');
});

test('mutations initialize csrf and send decoded token', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(null, { status: 204 });
  };
  await api('/tasks', { method: 'POST', body: { title: 'Assignment' } });
  assert.equal(requests[0].url, 'http://localhost:8000/sanctum/csrf-cookie');
  assert.equal(requests[1].options.headers['X-XSRF-TOKEN'], 'encoded=csrf');
  assert.equal(requests[1].options.credentials, 'include');
  await logout();
  assert.equal(requests.at(-1).url, 'http://localhost:8000/logout');
});

test('expired sessions dispatch expiry and validation errors are preserved', async () => {
  let expired = false;
  window.dispatchEvent = (event) => { expired = event.type === 'auth:expired'; };
  globalThis.fetch = async () => new Response('{}', { status: 401 });
  await assert.rejects(api('/me'), (error) => error.status === 401);
  assert.equal(expired, true);
  globalThis.fetch = async () => new Response(JSON.stringify({ errors: { title: ['Required'] } }), { status: 422 });
  await assert.rejects(api('/me'), (error) => error.errors.title[0] === 'Required');
});

test('development login uses the csrf protected session endpoint', async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return String(url).endsWith('/accounts')
      ? new Response(JSON.stringify({ data: [{ key: 'student-one' }] }))
      : new Response(null, { status: 204 });
  };
  assert.deepEqual((await developmentAccounts()).data, [{ key: 'student-one' }]);
  await loginAsDevelopmentAccount('student-one');
  assert.equal(requests.at(-1).url, 'http://localhost:8000/auth/development/login');
  assert.equal(requests.at(-1).options.body, JSON.stringify({ account: 'student-one' }));
  assert.equal(requests.at(-1).options.headers['X-XSRF-TOKEN'], 'encoded=csrf');
});
