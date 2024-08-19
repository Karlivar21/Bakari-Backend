// server.js
import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

// Configure Nodemailer with Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'kallabakari.pantanir@gmail.com', // Your Gmail address
    pass: 'z f o x l p b d r k h l t f m h' // Your Gmail app password or password (use app password for security)
  }
});

router.post('/', (req, res) => { 
  const { email, orderId } = req.body;

  const mailOptions = {
    from: 'kallabakari.pantanir@gmail.com',
    to: email,
    subject: 'Order Confirmation',
    text: `Thank you for your order! Your order ID is ${orderId}.`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).send(error.toString());
    }
    res.status(200).send('Email sent: ' + info.response);
  });
});

export default router;
