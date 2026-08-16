import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set");
  webpush.setVapidDetails("mailto:andres03ruht@gmail.com", publicKey, privateKey);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Sends one push notification to every stored subscription (single-user app,
 * multiple devices). A subscription that the browser has revoked comes back
 * as a 404/410 from the push service - those rows are deleted so the next
 * run doesn't keep retrying a dead endpoint.
 */
export async function sendPushToAllSubscriptions(supabase: SupabaseClient, payload: PushPayload): Promise<{ sent: number; pruned: number }> {
  ensureConfigured();

  const { data: subscriptions, error } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth");
  if (error) throw new Error(`Failed to load push subscriptions: ${error.message}`);
  if (!subscriptions || subscriptions.length === 0) return { sent: 0, pruned: 0 };

  let sent = 0;
  let pruned = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        pruned++;
      }
    }
  }

  return { sent, pruned };
}
