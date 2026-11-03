let state = Object.freeze({ supported: false, ready: false, checking: false, message: '' })
const listeners = new Set()
let registration
let initialization
let applying = false

function publish(patch) {
  state = Object.freeze({ ...state, ...patch })
  listeners.forEach(listener => listener(state))
}

export function getUpdateState() { return state }
export function subscribeUpdates(listener) {
  listeners.add(listener)
  listener(state)
  return () => listeners.delete(listener)
}

function observeWorker(worker) {
  if (!worker) return
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') {
      publish({ ready: Boolean(registration.waiting), checking: false, message: registration.waiting ? 'An update is ready to install.' : 'The app is ready for offline use.' })
    } else if (worker.state === 'redundant') {
      publish({ checking: false, message: 'The update could not be downloaded. Try again online.' })
    }
  })
}

export function initializePwa() {
  if (initialization) return initialization
  if (!import.meta.env?.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return Promise.resolve(null)
  publish({ supported: true })
  initialization = (async () => {
    try {
      const base = new URL(import.meta.env.BASE_URL, window.location.href)
      registration = await navigator.serviceWorker.register(new URL('sw.js', base), { scope: base.pathname, updateViaCache: 'none' })
      publish({ ready: Boolean(registration.waiting) })
      observeWorker(registration.installing)
      registration.addEventListener('updatefound', () => observeWorker(registration.installing))
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (applying) window.location.reload()
      })
      return registration
    } catch {
      publish({ checking: false, message: 'Offline app setup could not finish. Try again online.' })
      initialization = undefined
      return null
    }
  })()
  return initialization
}

export async function checkForUpdate() {
  const current = await initializePwa()
  if (!current) return false
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    publish({ message: 'Connect to the internet to check for updates.' })
    return false
  }
  publish({ checking: true, message: 'Checking for updates…' })
  try {
    await current.update()
    const ready = Boolean(current.waiting)
    publish({ ready, checking: Boolean(current.installing), message: ready ? 'An update is ready to install.' : current.installing ? 'Downloading the update…' : 'The app is up to date.' })
    return ready
  } catch {
    publish({ checking: false, message: 'Could not check for updates. Try again online.' })
    return false
  }
}

// Caller must persist pending work before requesting activation.
export async function applyUpdate() {
  const current = await initializePwa()
  if (!current?.waiting) return false
  applying = true
  publish({ message: 'Installing the update…' })
  current.waiting.postMessage({ type: 'SKIP_WAITING' })
  return true
}
