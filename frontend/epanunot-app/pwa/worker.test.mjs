import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import { renderWorker } from './worker.mjs'

function worker() {
  const handlers = {}
  const stored = new Map()
  let skipped = 0
  const context = {
    URL, Set, Promise,
    self: { location: { origin: 'https://app.test' }, registration: { scope: 'https://app.test/app/' }, addEventListener: (type, cb) => { handlers[type] = cb }, skipWaiting: () => { skipped++ }, clients: { claim: async () => {} } },
    caches: { open: async () => ({ addAll: async urls => urls.forEach(url => stored.set(url, url)), match: async url => stored.get(url) }), keys: async () => [], delete: async () => {} },
    fetch: async () => { throw new Error('offline') },
  }
  vm.runInNewContext(renderWorker(['index.html', 'assets/app-123.js', 'icons/icon-192.png'], 'abc'), context)
  return { handlers, stored, skipped: () => skipped }
}

test('only build allowlisted static files and scoped navigations are intercepted', async () => {
  const { handlers, stored } = worker()
  let install
  handlers.install({ waitUntil: value => { install = value } })
  await install
  for (const url of ['/api/tasks', '/app/api/tasks', '/app/uploads/file.png', '/app/auth/login', '/app/assets/unknown.js', '/other', 'https://google.com/app/assets/app-123.js']) {
    let intercepted = false
    handlers.fetch({ request: { url: new URL(url, 'https://app.test').href, method: 'GET', mode: 'cors' }, respondWith: () => { intercepted = true } })
    assert.equal(intercepted, false, url)
  }
  let response
  handlers.fetch({ request: { url: 'https://app.test/app/tasks', method: 'GET', mode: 'navigate' }, respondWith: value => { response = value } })
  assert.equal(await response, 'https://app.test/app/index.html')
  assert.equal(stored.size, 3)
})

test('a waiting worker activates only after explicit message', () => {
  const instance = worker()
  assert.equal(instance.skipped(), 0)
  instance.handlers.message({ data: { type: 'SKIP_WAITING' } })
  assert.equal(instance.skipped(), 1)
})
