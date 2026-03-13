'use client';

import { useEffect, useCallback, useRef } from 'react';
import API_URI from '@/utils/getApiUri';

/**
 * Subscribes the current browser to push notifications for a given order.
 * Uses order._id (orderId) as the unique key in the push_subscriptions collection.
 *
 * Only runs once per mount. Silently skips if:
 * - Browser doesn't support push
 * - User denies permission
 * - VAPID public key is not configured
 * - Service worker is not registered (disabled in dev mode)
 */
export default function usePushNotification(orderId) {
    const subscribedRef = useRef(false);

    const subscribe = useCallback(async () => {
        if (subscribedRef.current || !orderId) return;
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        try {
            // Request permission if not already granted
            let permission = Notification.permission;
            if (permission === 'denied') return;

            if (permission === 'default') {
                permission = await Notification.requestPermission();
            }

            if (permission !== 'granted') return;

            // Wait for the service worker to be ready
            const registration = await navigator.serviceWorker.ready;

            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC;
            if (!vapidKey) {
                console.warn('[PUSH] NEXT_PUBLIC_VAPID_PUBLIC not set');
                return;
            }

            // Reuse existing subscription or create a new one
            const existingSub = await registration.pushManager.getSubscription();
            const subscription =
                existingSub ||
                (await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey),
                }));

            // Register with our backend
            const res = await fetch(`${API_URI}/api/notifications/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription, userId: orderId }),
            });

            if (res.ok) {
                subscribedRef.current = true;
                console.log('[PUSH] Subscribed for order:', orderId);
            }
        } catch (err) {
            // Non-critical — tracking page still works without push
            console.warn('[PUSH] Could not subscribe:', err.message);
        }
    }, [orderId]);

    useEffect(() => {
        subscribe();
    }, [subscribe]);
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}
