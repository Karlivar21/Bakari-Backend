// routes/paymentRoutes.js
import express from 'express';
import crypto from 'crypto';

const router = express.Router();

router.post('/create-checkhash', (req, res) => {
  const {
    merchantid,
    returnurlsuccess,
    returnurlsuccessserver,
    orderid,
    amount,
    currency,
  } = req.body;

  const secretKey = process.env.SALT_PAY_SECRET; // Store in .env

  if (!secretKey) {
    return res.status(500).json({ error: 'Missing SaltPay secret key' });
  }

  const message = `${merchantid}|${returnurlsuccess}|${returnurlsuccessserver}|${orderid}|${amount}|${currency}`;
  const hmac = crypto
    .createHmac('sha256', secretKey)
    .update(message, 'utf8')
    .digest('hex');

  res.json({ checkhash: hmac });
});

export default router;
