import assert from 'node:assert/strict'
import test from 'node:test'
import { initializePwa, getUpdateState, subscribeUpdates, checkForUpdate, applyUpdate } from '../src/pwa/updates.js'

test('update module imports safely without browser globals and reports unsupported', async () => {
  const before = getUpdateState()
  assert.equal(before, getUpdateState())
  const received = []
  const unsubscribe = subscribeUpdates(state => received.push(state))
  await initializePwa()
  assert.equal(getUpdateState().supported, false)
  assert.equal(await checkForUpdate(), false)
  assert.equal(await applyUpdate(), false)
  unsubscribe()
  assert.ok(received.length > 0)
})
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

test('updates wait for explicit apply and scope registration to app base', async () => {
  let activationRequests = 0
  let reloads = 0
  let controllerChange
  let registeredUrl
  let registeredOptions
  const waiting = { postMessage: message => { assert.equal(message.type, 'SKIP_WAITING'); activationRequests++ } }
  const registration = { waiting, update: async () => {}, addEventListener: () => {} }
  const source = (await readFile(new URL('../src/pwa/updates.js', import.meta.url), 'utf8'))
    .replaceAll('import.meta.env?.PROD', 'true').replaceAll('import.meta.env.BASE_URL', "'/school/'").replaceAll('export ', '')
  const context = {
    navigator: { onLine: true, serviceWorker: { register: async (url, options) => { registeredUrl = url.href; registeredOptions = options; return registration }, addEventListener: (_type, callback) => { controllerChange = callback } } },
    window: { location: { href: 'https://app.test/school/tasks', reload: () => { reloads++ } } }, URL,
  }
  vm.createContext(context)
  vm.runInContext(source + '\nglobalThis.api = { initializePwa, getUpdateState, checkForUpdate, applyUpdate }', context)
  await context.api.initializePwa()
  assert.equal(registeredUrl, 'https://app.test/school/sw.js')
  assert.equal(registeredOptions.scope, '/school/')
  assert.equal(context.api.getUpdateState().ready, true)
  await context.api.checkForUpdate()
  controllerChange()
  assert.equal(reloads, 0)
  assert.equal(activationRequests, 0)
  assert.equal(await context.api.applyUpdate(), true)
  assert.equal(activationRequests, 1)
  controllerChange()
  assert.equal(reloads, 1)
})
