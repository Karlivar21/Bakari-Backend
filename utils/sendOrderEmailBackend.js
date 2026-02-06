import { mailjet } from "./mailjet.js";

export async function sendOrderEmailBackend(order) {
  const requestData = {
    Messages: [
      {
        From: { Email: "noreply@kallabakari.is", Name: "Kallabakarí" },
        To: [{ Email: order.email, Name: order.name }],
        Subject: "Greiðsla staðfest – pöntun móttekin",
        TextPart: `Takk fyrir pöntunina, ${order.name}. Greiðsla hefur verið staðfest. Pöntunarnúmer: ${order.id}`,
        HTMLPart: `
          <h2>Takk fyrir pöntunina, ${order.name}</h2>
          <p>Greiðsla hefur verið staðfest.</p>
          <p>Pöntunarnúmer: <b>${order.id}</b></p>
        `,
      },
    ],
  };

  const response = await mailjet.post("send", { version: "v3.1" }).request(requestData);
  return response.body;
}
