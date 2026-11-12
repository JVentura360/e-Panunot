import { api } from '../api/client.js';

function pushWorkerUrl() {
  return new URL('push/sw.js', new URL(import.meta.env?.BASE_URL ?? '/', window.location.href));
}

function isSupported() {
  return typeof window !== 'undefined'
    && window.isSecureContext
    && 'Notification' in window
    && 'PushManager' in window
    && 'serviceWorker' in navigator;
}

export async function getPushState() {
  if (!isSupported()) {
    return {
      supported: false,
      enabled: false,
      hint: 'Push notifications require a supported browser and a secure connection.',
    };
  }

  if (Notification.permission === 'denied') {
    return {
      supported: true,
      enabled: false,
      hint: 'Notifications are blocked in browser settings.',
    };
  }

  const registration = await navigator.serviceWorker.getRegistration(pushWorkerUrl().href);
  const subscription = await registration?.pushManager.getSubscription();
  const enabled = subscription ? (await api('/notifications/push-subscriptions/status', {
    method: 'POST', body: { endpoint: subscription.endpoint },
  })).subscribed === true : false;

  return {
    supported: true,
    enabled,
    hint: enabled ? 'Deadline alerts are enabled on this device.' : 'Get deadline alerts when e-Panunot is closed.',
  };
}

export async function enablePushNotifications() {
  if (!isSupported()) {
    throw new Error('Push notifications require a supported browser and a secure connection.');
  }

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error(permission === 'denied'
      ? 'Notifications are blocked in browser settings.'
      : 'Allow notifications in your browser to enable deadline alerts.');
  }

  const url = pushWorkerUrl();
  const registration = await navigator.serviceWorker.register(url, { scope: new URL('.', url).pathname });
  await waitForPushWorker(registration);
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeBase64Url((await api('/notifications/push/public-key')).public_key),
  });
  const serialized = subscription.toJSON();

  await api('/notifications/push-subscriptions', {
    method: 'POST',
    body: {
      endpoint: serialized.endpoint,
      keys: serialized.keys,
      contentEncoding: PushManager.supportedContentEncodings?.[0] ?? 'aes128gcm',
    },
  });

  return {
    supported: true,
    enabled: true,
    hint: 'Deadline alerts are enabled on this device.',
  };
}

function waitForPushWorker(registration) {
  if (registration.active?.state === 'activated') return Promise.resolve();
  const worker = registration.installing ?? registration.waiting ?? registration.active;
  if (!worker) return Promise.reject(new Error('The notification worker could not start. Please try again.'));
  return new Promise((resolve, reject) => {
    const finish = (error) => {
      clearTimeout(timeout);
      worker.removeEventListener('statechange', changed);
      if (error) reject(error);
      else resolve();
    };
    const changed = () => {
      if (worker.state === 'activated') finish();
      else if (worker.state === 'redundant') finish(new Error('The notification worker could not start. Please try again.'));
    };
    const timeout = setTimeout(() => finish(new Error('Starting notifications took too long. Please try again.')), 15000);
    worker.addEventListener('statechange', changed);
    changed();
  });
}

export async function detachPushForLogout() {
  if (!isSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration(pushWorkerUrl().href);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return null;
  try {
    await subscription.unsubscribe();
  } catch {
    // The logout endpoint also removes this subscription from the account.
  }
  return subscription.endpoint;
}

export async function disablePushNotifications() {
  const registration = await navigator.serviceWorker.getRegistration(pushWorkerUrl().href);
  const subscription = await registration?.pushManager.getSubscription();

  if (subscription) {
    await api('/notifications/push-subscriptions', {
      method: 'DELETE',
      body: { endpoint: subscription.endpoint },
    });
    await subscription.unsubscribe();
  }

  return {
    supported: true,
    enabled: false,
    hint: 'Deadline alerts are disabled on this device.',
  };
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
