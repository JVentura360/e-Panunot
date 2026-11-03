import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { renderWorker } from './worker.mjs'

export function staticShellPwa() {
  let html = ''
  return {
    name: 'epanunot-static-shell',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(source) { html = source },
    },
    async generateBundle(_options, bundle) {
      const publicFiles = ['manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png']
      const files = Object.keys(bundle).filter(name => name === 'index.html' || /^assets\/.*\.(js|css|woff2?|png|svg|webp|jpg|jpeg)$/.test(name))
      const hash = createHash('sha256')
      hash.update(html)
      for (const name of [...files].sort()) {
        const asset = bundle[name]
        hash.update(name).update(asset.type === 'chunk' ? asset.code : asset.source)
      }
      for (const name of publicFiles) hash.update(await readFile(new URL('../public/' + name, import.meta.url)))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: renderWorker([...new Set(['index.html', ...files, ...publicFiles])], hash.digest('hex').slice(0, 16)) })
    },
  }
}
