import express from 'express';
import Mailjet from 'node-mailjet';

const router = express.Router();

// Initialize Mailjet client
const mailjet = Mailjet.apiConnect('3ac0f68ea6606e9bc0447c088ce1cdaa', '218791fefdda48f329e30e58d991a0e5');

// Route to send email
router.post('/', async (req, res) => {
  const { to, subject, text, html } = req.body;

  const request = {
    Messages: [
      {
        From: {
          Email: "noreply@kallabakari.is",
          Name: "Kallabakarí"
        },
        To: [
          {
            Email: to
          }
        ],
        Subject: subject,
        TextPart: text,
        HTMLPart: html
      }
    ]
  };

  try {
    const response = await mailjet.post('send', { version: 'v3.1' }).request(request);
    res.status(200).json(response.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
