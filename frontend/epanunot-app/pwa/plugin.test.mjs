import assert from 'node:assert/strict'
import test from 'node:test'
import { staticShellPwa } from './plugin.mjs'

test('shell is precached even when Vite emits index after this hook', async () => {
  const plugin = staticShellPwa()
  let output
  await plugin.generateBundle.call({ emitFile: value => { output = value } }, {}, { 'assets/app.js': { type: 'chunk', code: 'app' } })
  assert.ok(output.source.includes('"index.html"'))
})
