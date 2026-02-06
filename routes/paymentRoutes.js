// routes/paymentRoutes.js
import express from "express";
import Order from '../models/Order.js';
import mongoose from "mongoose";
import crypto from "crypto";
import { sendOrderEmailBackend } from "../utils/sendOrderEmailBackend.js";

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

    const amountMinor = order.totalAmount;
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      return res.status(400).json({ error: "Order totalAmount missing/invalid" });
    }
    // after: const order = await Order.findById(orderId);



    const currency = "ISK";

    const token = await getTeyaAccessToken();
    const publicOrderId = order.id;
      const payload = {
      // ✅ per docs
      amount: { currency: "ISK", value: amountMinor },
      type: "SALE",
       // UUID shown to customers
      success_url: `https://kallabakari.is/order/success?orderId=${publicOrderId}`,
      failure_url: `https://kallabakari.is/order/error?orderId=${publicOrderId}`,
      cancel_url: `https://kallabakari.is/pantanir?orderId=${publicOrderId}`,
      // IMPORTANT: keep merchant_reference as Mongo _id for webhook mapping
      merchant_reference: String(order._id),

      // ✅ include store_id since you have it
      store_id: process.env.STORE_ID,

      // optional: prefills
      customer: {
        name: order.name,
        email: order.email,
        // only if in E.164 format; otherwise remove
      },

      // optional:
      // language: "is-IS",
      // post_success_payment: "REDIRECT",
    };

    if (!TEYA_API_BASE || !TEYA_CHECKOUT_SESSIONS_PATH) {
      return res.status(500).json({
        error: "Missing TEYA_API_BASE or TEYA_CHECKOUT_SESSIONS_PATH env var",
      });
    }

    const url = `${TEYA_API_BASE}${TEYA_CHECKOUT_SESSIONS_PATH}`;
    console.log("TEYA URL:", url);
    console.log("TEYA STORE:", process.env.STORE_ID);
    console.log("TEYA PAYLOAD:", JSON.stringify(payload, null, 2));

    const teyaRes = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
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



    const redirectUrl = session.session_url || session.checkoutUrl || session.url || session.redirectUrl;
    const sessionId = session.session_id || session.sessionId || session.id;


    if (!redirectUrl) {
      console.error("Unexpected Teya session response:", session);
      return res.status(502).json({ error: "Teya did not return redirect URL" });
    }

    order.paymentProvider = "teya";
    order.checkoutSessionId = sessionId;
    order.paymentStatus = "pending";
    await order.save();

    return res.json({ redirectUrl, sessionId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error creating checkout session" });
  }
});


function verifyTeyaSignature({ rawBody, signatureB64, publicKeyPem }) {
  if (!rawBody || !signatureB64 || !publicKeyPem) return false;

  try {
    const signature = Buffer.from(String(signatureB64), "base64");
    return crypto.verify("RSA-SHA256", rawBody, publicKeyPem, signature);
  } catch (e) {
    return false;
  }
}

/**
 * 2) Webhook endpoint
 * Configure this URL in Teya Business Portal:
 *   https://api.kallabakari.is/api/payment/teya/webhook
 */


router.post("/teya/webhook", async (req, res) => {
  try {
    console.log("✅ TEYA WEBHOOK HIT", {
      headers: req.headers,
      bodyType: typeof req.body,
      body: req.body,
    });

    const event = req.body;

    // ✅ Teya uses `event`, not `type`
    const eventName = event?.event; // e.g. "payment.succeeded.v1"
    const status = event?.data?.status; // e.g. "SUCCESS"

    const merchantRef = event?.data?.merchant_reference;
    const sessionId = event?.data?.session_id;
    const paymentId = event?.data?.transaction_id;

    // Find order
    let order = null;
    if (merchantRef && mongoose.Types.ObjectId.isValid(String(merchantRef))) {
      order = await Order.findById(merchantRef);
    }
    if (!order && sessionId) {
      order = await Order.findOne({ checkoutSessionId: sessionId });
    }

    if (!order) {
      console.warn("Teya webhook: order not found", { merchantRef, sessionId, eventName });
      return res.status(200).send("ok");
    }

    // ✅ Treat success when eventName matches OR status is SUCCESS
    const isSuccess =
      eventName === "payment.succeeded.v1" ||
      status === "SUCCESS";

    if (!isSuccess) {
      console.log("Teya webhook: not success", { eventName, status });
      return res.status(200).send("ok");
    }

    // Idempotency
    if (order.emailSentAt) return res.status(200).send("ok");


    // Mark paid
    if (!order.payed) {
      order.paymentStatus = "paid";
      order.payed = true;
      order.paidAt = new Date();
      order.paymentId = paymentId ? String(paymentId) : null;
    }
    await order.save();

    if (!order.emailSentAt) {
      await sendOrderEmailBackend(order);
      order.emailSentAt = new Date();
      await order.save();
    }

    console.log("✅ Order marked paid", {
      orderId: order._id.toString(),
      paymentId: order.paymentId,
      sessionId: order.checkoutSessionId,
    });

    return res.status(200).send("ok");
  } catch (err) {
    console.error("Teya webhook error:", err);
    return res.status(500).send("error");
  }
});



export default router;
