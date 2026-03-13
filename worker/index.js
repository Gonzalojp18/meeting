// Custom Service Worker — Push Notification Handler
// next-pwa compiles and injects this file into the generated sw.js

self.addEventListener('push', (event) => {
    const data = event.data?.json() ?? {};

    const title = data.title || 'Meeting Resto Bar';
    const options = {
        body: data.body || 'Tu pedido ha sido actualizado',
        icon: data.icon || '/meet.jpeg',
        badge: data.badge || '/meet.jpeg',
        vibrate: [200, 100, 200, 100, 200],
        tag: 'order-update',
        renotify: true,
        data: {
            url: data.url || '/',
        },
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If a window with that URL is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(url) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});
