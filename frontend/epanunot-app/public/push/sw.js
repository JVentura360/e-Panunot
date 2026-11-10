self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() ?? '' };
  }

  const title = payload.title || 'e-Panunot';
  const options = {
    body: payload.body || 'You have a new notification.',
    data: payload.data || {},
    tag: payload.tag,
    icon: new URL('../icons/icon-192.png', self.registration.scope).href,
    badge: new URL('../icons/icon-192.png', self.registration.scope).href,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requestedUrl = event.notification.data?.url || '/';
  const target = new URL(requestedUrl, self.location.origin);

  if (target.origin !== self.location.origin) {
    return;
  }

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
    const client = clients.find((candidate) => new URL(candidate.url).origin === target.origin);
    if (client) {
      await client.navigate(target.href);
      return client.focus();
    }
    return self.clients.openWindow(target.href);
  }));
});
