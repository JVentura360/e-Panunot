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

      // Entry chunks and everything they import statically are needed for the first screen.
      const eager = new Set()
      const visit = (name) => {
        const chunk = bundle[name]
        if (!chunk || chunk.type !== 'chunk' || eager.has(name)) return
        eager.add(name)
        chunk.imports.forEach(visit)
      }
      Object.values(bundle).filter(item => item.type === 'chunk' && item.isEntry).forEach(item => visit(item.fileName))
      const isLazy = (name) => bundle[name]?.type === 'chunk' && !eager.has(name)
      const core = [...new Set(['index.html', ...files.filter(name => !isLazy(name)), ...publicFiles])]
      const lazy = files.filter(isLazy)

      this.emitFile({ type: 'asset', fileName: 'sw.js', source: renderWorker(core, hash.digest('hex').slice(0, 16), lazy) })
    },
  }
}
