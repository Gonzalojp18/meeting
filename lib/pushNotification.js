import webpush from 'web-push';
import clientPromise from '@/lib/mongodbClient';

if (process.env.VAPID_PUBLIC && process.env.VAPID_PRIVATE) {
    webpush.setVapidDetails(
        'mailto:pgonzalojose@gmail.com',
        process.env.VAPID_PUBLIC,
        process.env.VAPID_PRIVATE
    );
}

/**
 * Sends a push notification to a user by their subscription userId.
 * @param {Object} params
 * @param {string} params.userId - Key used when subscribing (order._id.toString())
 * @param {string} params.title - Notification title
 * @param {string} params.body  - Notification body (personalized message)
 * @param {string} [params.url] - URL to open when the notification is clicked
 */
export async function sendPushNotification({ userId, title, body, url = '/' }) {
    if (!process.env.VAPID_PUBLIC || !process.env.VAPID_PRIVATE) {
        console.warn('[PUSH] VAPID keys not configured — skipping notification');
        return { success: false, reason: 'vapid_not_configured' };
    }

    try {
        const client = await clientPromise;
        const db = client.db('menu');
        const userSubscription = await db.collection('push_subscriptions').findOne({ userId });

        if (!userSubscription) {
            console.log(`[PUSH] No subscription found for userId: ${userId}`);
            return { success: false, reason: 'no_subscription' };
        }

        const payload = JSON.stringify({
            title,
            body,
            icon: '/meet.jpeg',
            badge: '/meet.jpeg',
            url,
        });

        await webpush.sendNotification(userSubscription.subscription, payload);
        console.log(`[PUSH] Notification sent to userId: ${userId}`);
        return { success: true };
    } catch (error) {
        // Subscription expired or invalid — clean it up so it doesn't pile up
        if (error.statusCode === 410) {
            try {
                const client = await clientPromise;
                const db = client.db('menu');
                await db.collection('push_subscriptions').deleteOne({
                    'subscription.endpoint': error.endpoint,
                });
                console.log('[PUSH] Expired subscription removed');
            } catch (_) {}
            return { success: false, reason: 'subscription_expired' };
        }

        console.error('[PUSH] Error sending notification:', error.message);
        return { success: false, reason: 'error' };
    }
}
