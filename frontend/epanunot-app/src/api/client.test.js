import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = { location: { origin: 'http://localhost:5173' }, dispatchEvent: () => {}, addEventListener: () => {}, removeEventListener: () => {} };
globalThis.document = { cookie: 'XSRF-TOKEN=encoded%3Dcsrf' };

const { api, logout, googleLoginUrl, developmentAccounts, loginAsDevelopmentAccount, getPendingRequestCount, subscribeRequests, clearApiCache, apiQueryOptions, queryClient, refreshSyncQueries } = await import('./client.js');
queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, gcTime: Infinity } });

test('sync checks do not show request loading, and changed domains refresh only active data', async () => {
  const reads = [];
  globalThis.fetch = async (url) => {
    reads.push(url.pathname);
    if (url.pathname === '/api/sync') assert.equal(getPendingRequestCount(), 0);
    return new Response(JSON.stringify({ data: [] }));
  };
  await api('/sync', { force: true });
  for (const path of ['/tasks', '/calendar', '/personal-todos', '/announcements']) await api(path);
  const observer = new QueryObserver(queryClient, apiQueryOptions('/tasks'));
  const unsubscribe = observer.subscribe(() => {});
  reads.length = 0;
  await refreshSyncQueries(['tasks']);
  assert.deepEqual(reads, ['/api/tasks']);
  assert.equal(queryClient.getQueryState(apiQueryOptions('/calendar').queryKey).isInvalidated, true);
  assert.equal(queryClient.getQueryState(apiQueryOptions('/personal-todos').queryKey).isInvalidated, false);
  assert.equal(queryClient.getQueryState(apiQueryOptions('/announcements').queryKey).isInvalidated, false);
  unsubscribe();
});
beforeEach(() => clearApiCache());
afterEach(() => clearApiCache());
const { QueryObserver, focusManager } = await import('@tanstack/react-query');

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

test('multipart uploads preserve files and let the browser set the content boundary', async () => {
  let sent;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('/api/concerns')) sent = options;
    return new Response('{}');
  };
  const body = new FormData();
  body.append('title', 'Subject concern');
  body.append('attachments[]', new Blob(['attachment'], { type: 'text/plain' }), 'note.txt');
  await api('/concerns', { method: 'POST', body });
  assert.equal(sent.body, body);
  assert.equal(sent.headers['Content-Type'], undefined);
  assert.equal(sent.headers['X-XSRF-TOKEN'], 'encoded=csrf');
});

test('expired sessions dispatch expiry and validation errors are preserved', async () => {
  let expired = false;
  window.dispatchEvent = (event) => { expired = event.type === 'auth:expired'; };
  globalThis.fetch = async () => new Response('{}', { status: 401 });
  await assert.rejects(api('/me'), (error) => error.status === 401);
  await new Promise((resolve) => setTimeout(resolve, 0));
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

test('identical reads share one pending request and reuse fresh results', async () => {
  let calls = 0;
  let finish;
  globalThis.fetch = async () => {
    calls++;
    await new Promise((resolve) => { finish = resolve; });
    return new Response(JSON.stringify({ data: [] }));
  };
  const first = api('/blocks');
  const second = api('/blocks');
  assert.equal(calls, 1);
  finish();
  assert.deepEqual(await first, await second);
  assert.deepEqual(await api('/blocks'), { data: [] });
  assert.equal(calls, 1);
  const third = api('/blocks', { force: true });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls, 2);
  finish();
  await third;
});

test('cached lists are invalidated after writes, while unrelated data stays fresh', async () => {
  const reads = [];
  globalThis.fetch = async (url, options) => {
    if (options.method === 'GET') reads.push(url.pathname);
    return new Response(JSON.stringify({ data: [] }));
  };
  await api('/blocks');
  await api('/subjects');
  await api('/blocks/1/join-requests/2/approve', { method: 'POST' });
  await api('/blocks');
  await api('/subjects');
  assert.deepEqual(reads, ['/api/blocks', '/api/subjects', '/api/blocks']);
});

test('enrollment changes refresh ledger, identity, and subject access while preserving unrelated cache', async () => {
  const reads = [];
  globalThis.fetch = async (url, options) => {
    if (options.method === 'GET') reads.push(url.pathname);
    return new Response(JSON.stringify({ data: [] }));
  };
  const paths = ['/subject-enrollments/mine', '/me', '/blocks/1/members', '/tasks', '/announcements', '/calendar', '/personal-todos'];
  for (const path of paths) await api(path);
  for (const method of ['POST', 'DELETE']) {
    reads.length = 0;
    await api(method === 'POST' ? '/subject-enrollments' : '/subject-enrollments/1', { method });
    for (const path of paths) await api(path);
    assert.deepEqual(reads, paths.slice(0, -1).map((path) => '/api' + path));
  }
});

test('shared-load publication and mayor approval refresh dependent caches without clearing unrelated data', async () => {
  const reads = [];
  globalThis.fetch = async (url, options) => {
    if (options.method === 'GET') reads.push(url.pathname);
    return new Response(JSON.stringify({ data: [] }));
  };
  const related = ['/subject-loads/current', '/subjects', '/blocks', '/admin/mayor-applications', '/mayor-applications/mine', '/me', '/subject-enrollments/mine', '/tasks', '/calendar'];
  for (const path of [...related, '/personal-todos']) await api(path);
  for (const path of ['/admin/subject-loads/current', '/admin/mayor-applications/1/approve']) {
    reads.length = 0;
    await api(path, { method: path.endsWith('/approve') ? 'POST' : 'PUT', body: {} });
    for (const read of [...related, '/personal-todos']) await api(read);
    assert.deepEqual(reads, related.map((read) => '/api' + read));
  }
});

test('classification and regular enrollment refresh eligibility and ledger without clearing unrelated reads', async () => {
  const reads = [];
  globalThis.fetch = async (url, options) => {
    if (options.method === 'GET') reads.push(url.pathname);
    return new Response(JSON.stringify({ data: [] }));
  };
  const paths = ['/enrollment-profile', '/me', '/subject-enrollments/mine', '/blocks/4/members', '/tasks', '/calendar', '/mayor-applications/mine'];
  for (const path of [...paths, '/personal-todos']) await api(path);
  for (const path of ['/enrollment-profile', '/enrollment-profile/reconcile-mayor', '/blocks/4/enrollment', '/blocks/4/join']) {
    reads.length = 0;
    await api(path, { method: path === '/enrollment-profile' ? 'PUT' : 'POST', body: {} });
    for (const read of [...paths, '/personal-todos']) await api(read);
    assert.deepEqual(reads, paths.map((read) => '/api' + read));
  }
});

test('expired data refetches, with conservative focus settings', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('{}'); };
  await api('/blocks');
  queryClient.setQueryData(apiQueryOptions('/blocks').queryKey, {}, { updatedAt: Date.now() - 121000 });
  await api('/blocks');
  assert.equal(calls, 2);
  assert.equal(apiQueryOptions('/blocks').refetchOnWindowFocus, false);
  assert.equal(apiQueryOptions('/me').refetchOnWindowFocus, true);
  assert.equal(apiQueryOptions('/me').staleTime, 60000);
});

test('focus return only refreshes stale identity, not fresh data or ordinary lists', async () => {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url.pathname);
    return new Response(JSON.stringify({ data: {} }));
  };
  queryClient.mount();
  const blocks = new QueryObserver(queryClient, apiQueryOptions('/blocks'));
  const identity = new QueryObserver(queryClient, apiQueryOptions('/me'));
  const stopBlocks = blocks.subscribe(() => {});
  const stopIdentity = identity.subscribe(() => {});
  try {
    await Promise.all([api('/blocks'), api('/me')]);
    queryClient.setQueryData(apiQueryOptions('/blocks').queryKey, { data: {} }, { updatedAt: Date.now() - 121000 });
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(calls.length, 2);
    queryClient.setQueryData(apiQueryOptions('/me').queryKey, { data: {} }, { updatedAt: Date.now() - 61000 });
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(calls, ['/api/blocks', '/api/me', '/api/me']);
  } finally {
    stopBlocks();
    stopIdentity();
    queryClient.unmount();
    focusManager.setFocused(undefined);
  }
});

test('account switching clears old cached identity', async () => {
  let account = 'student-one';
  globalThis.fetch = async (url) => {
    if (String(url).endsWith('/login')) { account = 'student-two'; return new Response(null, { status: 204 }); }
    return new Response(JSON.stringify({ data: { name: account } }));
  };
  assert.equal((await api('/me')).data.name, 'student-one');
  await loginAsDevelopmentAccount('student-two');
  assert.equal((await api('/me')).data.name, 'student-two');
});

test('identity changes from another tab expire the old account before its private cache can be reused', async () => {
  let id = 4;
  let expired = false;
  const dispatch = window.dispatchEvent;
  window.dispatchEvent = (event) => { if (event.type === 'auth:expired') expired = true; };
  globalThis.fetch = async (url) => new Response(JSON.stringify({ data: url.pathname.endsWith('/me') ? { id } : ['private account four'] }));
  await api('/me');
  await api('/personal-todos');
  id = 9;
  await assert.rejects(api('/me', { force: true }));
  assert.equal(expired, true);
  assert.equal(queryClient.getQueryData(apiQueryOptions('/personal-todos').queryKey), undefined);
  assert.equal(queryClient.getQueryData(apiQueryOptions('/me').queryKey), undefined);
  window.dispatchEvent = dispatch;
});

test('page remounts reuse data, and stale refresh keeps cached content visible', async () => {
  let calls = 0;
  let finish;
  globalThis.fetch = async () => {
    calls++;
    if (calls > 1) await new Promise((resolve) => { finish = resolve; });
    return new Response(JSON.stringify({ data: calls }));
  };
  await api('/blocks');
  const firstPage = new QueryObserver(queryClient, apiQueryOptions('/blocks'));
  const leave = firstPage.subscribe(() => {});
  assert.equal(firstPage.getCurrentResult().data.data, 1);
  assert.equal(calls, 1);
  leave();
  queryClient.setQueryData(apiQueryOptions('/blocks').queryKey, { data: 1 }, { updatedAt: Date.now() - 121000 });
  const returnPage = new QueryObserver(queryClient, apiQueryOptions('/blocks'));
  const unsubscribe = returnPage.subscribe(() => {});
  assert.equal(returnPage.getCurrentResult().data.data, 1);
  assert.equal(returnPage.getCurrentResult().isPending, false);
  assert.equal(returnPage.getCurrentResult().isFetching, true);
  finish();
  await api('/blocks');
  assert.equal(returnPage.getCurrentResult().data.data, 2);
  unsubscribe();
});

test('late responses from a logged-out account cannot overwrite the new account cache', async () => {
  let finishOld;
  globalThis.fetch = async (url, options) => {
    if (url.pathname === '/api/blocks' && options.method === 'GET') {
      await new Promise((resolve) => { finishOld = resolve; });
      return new Response(JSON.stringify({ data: 'old account' }));
    }
    return new Response(null, { status: 204 });
  };
  const oldRequest = api('/blocks').catch(() => null);
  await logout();
  globalThis.fetch = async () => new Response(JSON.stringify({ data: 'new account' }));
  assert.equal((await api('/blocks')).data, 'new account');
  finishOld();
  await oldRequest;
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal((await api('/blocks')).data, 'new account');
});

test('request activity tracks parallel requests and clears after success or failure', async () => {
  const states = [];
  const unsubscribe = subscribeRequests(() => states.push(getPendingRequestCount()));
  const finishes = [];
  globalThis.fetch = async (url) => {
    await new Promise((resolve) => finishes.push(resolve));
    if (url.pathname.endsWith('/failure')) throw new Error('offline');
    return new Response('{}');
  };
  const first = api('/success');
  const second = api('/failure');
  assert.equal(getPendingRequestCount(), 2);
  finishes[0]();
  await first;
  assert.equal(getPendingRequestCount(), 1);
  finishes[1]();
  await assert.rejects(second, (error) => error.status === 0);
  assert.equal(getPendingRequestCount(), 0);
  assert.deepEqual(states, [1, 2, 1, 0]);
  unsubscribe();
  globalThis.fetch = async () => new Response('{}');
  await api('/failure');
  assert.equal(getPendingRequestCount(), 0);
});
