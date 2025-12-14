// routes/paymentRoutes.js
import express from "express";
import Order from '../models/Order.js';
import mongoose from "mongoose";


const router = express.Router();

/**
 * ENV VARS YOU SHOULD SET
 * ----------------------
 * TEYA_ENV=staging|production
 * TEYA_CLIENT_ID=...
 * TEYA_CLIENT_SECRET=...
 *
 * For PROD:
 * TEYA_OAUTH_URL=https://id.teya.com/oauth/v2/oauth-token
 *
 * For STAGING:
 * TEYA_OAUTH_URL=https://id.teya.xyz/oauth/v2/oauth-token
 *
 * The base API host + path for checkout sessions MUST come from Teya docs/portal
 * TEYA_API_BASE=https://<their-api-host>
 * TEYA_CHECKOUT_SESSIONS_PATH=/checkout/sessions   (example placeholder)
 *
 * TEYA_WEBHOOK_SECRET=... (only if Teya provides a signing secret)
 */

const TEYA_OAUTH_URL =
  process.env.TEYA_OAUTH_URL || "https://id.teya.com/oauth/v2/oauth-token";

const TEYA_API_BASE = process.env.TEYA_API_BASE; // REQUIRED
const TEYA_CHECKOUT_SESSIONS_PATH = process.env.TEYA_CHECKOUT_SESSIONS_PATH; // REQUIRED

let cachedToken = null; // { accessToken, expiresAt }

/** Get OAuth access token (client_credentials) with basic caching */
async function getTeyaAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.TEYA_CLIENT_ID,
    client_secret: process.env.TEYA_CLIENT_SECRET,
    // add only what you need
    scope: "checkout/sessions/create checkout/sessions/id/get",
  });

  const res = await fetch(TEYA_OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Teya OAuth error:", t);
    throw new Error("Failed to get Teya access token");
  }

  const json = await res.json();
  cachedToken = {
    accessToken: json.access_token,
    expiresAt: now + (json.expires_in * 1000),
  };

  return cachedToken.accessToken;
}

/**
 * 1) Create Hosted Checkout Session
 * Frontend calls this, you return redirectUrl
 */
router.post("/teya/checkout-session", async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) return res.status(400).json({ error: "Missing orderId" });
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ error: "Invalid orderId" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const amountMinor = Math.round(order.totalPrice);
    const currency = "ISK";

    const token = await getTeyaAccessToken();

    const payload = {
      transactionType: "PURCHASE",
      reference: String(order._id),
      amount: { value: amountMinor, currency },
      successUrl: `https://kallabakari.is/order/success?orderId=${order._id}`,
      cancelUrl: `https://kallabakari.is/cart`,
    };

    if (!TEYA_API_BASE || !TEYA_CHECKOUT_SESSIONS_PATH) {
      return res.status(500).json({
        error: "Missing TEYA_API_BASE or TEYA_CHECKOUT_SESSIONS_PATH env var",
      });
    }

    const url = `${TEYA_API_BASE}${TEYA_CHECKOUT_SESSIONS_PATH}`;

    const teyaRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Store-Id": process.env.STORE_ID,
      },
      body: JSON.stringify(payload),
    });

    if (!teyaRes.ok) {
      const t = await teyaRes.text();
      console.error("Teya create session error:", teyaRes.status, teyaRes.statusText, t);
      return res.status(502).json({
        error: "Teya session creation failed",
        teyaStatus: teyaRes.status,
        teyaBody: t,
      });
    }

    const session = await teyaRes.json();

    const redirectUrl = session.checkoutUrl || session.url || session.redirectUrl;
    const sessionId = session.id;

    if (!redirectUrl) {
      console.error("Unexpected Teya session response:", session);
      return res.status(502).json({ error: "Teya did not return redirect URL" });
    }

    order.paymentProvider = "teya";
    order.paymentSessionId = sessionId;
    order.paymentStatus = "PENDING";
    await order.save();

    return res.json({ redirectUrl, sessionId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error creating checkout session" });
  }
});

/**
 * 2) Webhook endpoint
 * Configure this URL in Teya Business Portal:
 *   https://kallabakari.is/api/payment/teya/webhook
 */
router.post("/teya/webhook", async (req, res) => {
  try {
    // If Teya provides signature headers + a signing secret, verify here using:
    // - req.rawBody (from your server.js verify hook)
    // - signature header(s)
    // - TEYA_WEBHOOK_SECRET
    //
    // Because I don’t have Teya’s exact signature scheme from the snippet, I’m leaving verification as a TODO.
    // DO NOT skip verification in production if Teya supports it.

    const event = req.body;

    // ⚠️ Adjust these fields to match Teya webhook payload structure
    const eventType = event.type || event.eventType;
    const reference = event.data?.reference || event.reference;
    const paymentId = event.data?.id || event.paymentId;

    if (!eventType) {
      return res.status(400).send("Missing event type");
    }

    // Handle “Payment Succeeded”
    // ⚠️ exact string depends on Teya; you mentioned “Payment Succeeded” in portal
    const isPaymentSucceeded =
      eventType === "payment.succeeded" ||
      eventType === "PAYMENT_SUCCEEDED" ||
      eventType === "Payment Succeeded";

    if (isPaymentSucceeded && reference) {
      const order = await Order.findById(reference);
      if (!order) {
        // return 200 to avoid retries if order already deleted, but log it
        console.warn("Webhook: order not found for reference:", reference);
        return res.status(200).send("ok");
      }

      // Idempotency: if already paid, do nothing
      if (order.isPaid) {
        return res.status(200).send("ok");
      }

      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentStatus = "SUCCEEDED";
      order.paymentProvider = "teya";
      order.paymentId = paymentId;

      await order.save();
    }

    return res.status(200).send("ok");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).send("error");
  }
});

export default router;
