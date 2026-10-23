import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function sendPushToAll(payload) {
  const subscriptions = await PushSubscription.find();
  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(payload)
      ).catch(async err => {
        // 410 Gone = subscription expired/revoked — clean it up
        if (err.statusCode === 410) {
          await PushSubscription.deleteOne({ endpoint: sub.endpoint });
        }
        throw err;
      })
    )
  );
  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed) console.warn(`Push: ${failed}/${subscriptions.length} deliveries failed`);
}
