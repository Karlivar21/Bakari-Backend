import express from "express";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import { sesClient } from "../utils/ses.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { to, subject, text, html } = req.body;

  const command = new SendEmailCommand({
    Source: "Kallabakarí <noreply@kallabakari.is>",
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: {
        Text: { Data: text || "", Charset: "UTF-8" },
        Html: { Data: html || "", Charset: "UTF-8" },
      },
    },
  });

  try {
    const response = await sesClient.send(command);
    res.status(200).json({ MessageId: response.MessageId });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
