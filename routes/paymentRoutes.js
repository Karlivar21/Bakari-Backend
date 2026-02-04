// routes/paymentRoutes.js
import express from "express";
import Order from '../models/Order.js';
import mongoose from "mongoose";
import crypto from "crypto";


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

      const payload = {
      // ✅ per docs
      amount: { currency: "ISK", value: amountMinor },
      type: "SALE",
      success_url: `https://kallabakari.is/order/success?orderId=${order._id}`,
      cancel_url: `https://kallabakari.is/pantanir`,
      failure_url: `https://kallabakari.is/order/error?orderId=${order._id}`,

      // ✅ recommended
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
    // ✅ Express already parsed JSON
    const event = req.body;

    // TEMP: log what Teya actually sends (remove later)
    console.log("✅ TEYA WEBHOOK RECEIVED", {
      contentType: req.headers["content-type"],
      eventType: event?.type || event?.eventType || event?.name,
      hasRawBody: !!req.rawBody,
    });

    // ✅ If you want signature verification:
    const shouldVerify = process.env.TEYA_VERIFY_WEBHOOK === "true";
    if (shouldVerify) {
      const signatureHeader =
        req.headers["teya-signature"] ||
        req.headers["x-teya-signature"] ||
        req.headers["signature"];

      const ok = verifyTeyaSignature({
        rawBody: req.rawBody, // Buffer from your express.json verify hook
        signatureB64: signatureHeader,
        publicKeyPem: process.env.TEYA_WEBHOOK_PUBLIC_KEY,
      });

      if (!ok) {
        console.warn("Teya webhook: invalid signature");
        return res.status(401).send("invalid signature");
      }
    }

    const eventType = event?.type || event?.eventType || event?.name;

    const merchantRef =
      event?.data?.merchant_reference ||
      event?.merchant_reference ||
      event?.data?.merchantReference;

    const sessionId =
      event?.data?.session_id ||
      event?.session_id ||
      event?.data?.sessionId;

    const paymentId =
      event?.data?.payment_id ||
      event?.data?.id ||
      event?.payment_id;

    // Find order
    let order = null;

    if (merchantRef && mongoose.Types.ObjectId.isValid(String(merchantRef))) {
      order = await Order.findById(merchantRef);
    }
    if (!order && sessionId) {
      order = await Order.findOne({ checkoutSessionId: sessionId });
    }

    if (!order) {
      console.warn("Teya webhook: order not found", { merchantRef, sessionId, eventType });
      return res.status(200).send("ok");
    }

    // ✅ IMPORTANT: you must match Teya’s real success event name
    const SUCCESS_TYPES = new Set([
      "payment.succeeded",
      "PAYMENT_SUCCEEDED",
      "Payment Succeeded",
      "checkout.session.completed",
      "payment.captured",
      "payment.completed",
    ]);

    if (!SUCCESS_TYPES.has(String(eventType))) {
      console.log("Teya webhook: ignoring eventType", eventType);
      return res.status(200).send("ok");
    }

    if (order.paymentStatus === "paid" || order.payed === true) {
      return res.status(200).send("ok");
    }

    order.paymentStatus = "paid";
    order.payed = true;
    order.paidAt = new Date();
    order.paymentId = paymentId ? String(paymentId) : null;
    await order.save();

    if (!order.emailSentAt) {
      await sendOrderEmailBackend(order);
      order.emailSentAt = new Date();
      await order.save();
    }

    console.log("✅ Order marked paid", { orderId: order._id.toString() });

    return res.status(200).send("ok");
  } catch (err) {
    console.error("Teya webhook error:", err);
    return res.status(500).send("error");
  }
});


export default router;
