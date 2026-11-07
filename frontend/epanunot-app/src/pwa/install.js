let deferred = null;
let snapshot = Object.freeze({ canPrompt: false });
const listeners = new Set();

const publish = () => {
  snapshot = Object.freeze({ canPrompt: Boolean(deferred) });
  listeners.forEach((listener) => listener());
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event;
    publish();
  });
  window.addEventListener('appinstalled', () => { deferred = null; publish(); });
}

export const getInstallState = () => snapshot;
export const subscribeInstall = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };

export const isInstalled = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);

export const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  publish();
  return outcome === 'accepted';
}