import express from 'express';
import Mailjet from 'node-mailjet';

const router = express.Router();

// Initialize Mailjet client
const mailjet = Mailjet.apiConnect('3ac0f68ea6606e9bc0447c088ce1cdaa', '6de48e2aa320803ee8ff6a454f7b7862');

// Route to send email
router.post('/', async (req, res) => {
  const { to, subject, text, html } = req.body;

  // Ensure requestData is defined and properly scoped
  const requestData = {
    Messages: [
      {
        From: {
          Email: 'noreply@kallabakari.is',
          Name: 'Kallabakarí'
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
    console.log('Sending email with data:', requestData); // Log request data
    const response = await mailjet.post('send', { version: 'v3.1' }).request(requestData);
    console.log('Mailjet response:', response.body); // Log Mailjet response
    res.status(200).json(response.body);
  } catch (error) {
    console.error('Error sending email:', error); // Log error details
    res.status(500).json({ error: error.message });
  }
});

export default router;
