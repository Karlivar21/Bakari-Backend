import { resend } from "./ses.js";

const formatISK = (n) =>
  new Intl.NumberFormat("is-IS", { maximumFractionDigits: 0 }).format(
    Number.isFinite(Number(n)) ? Number(n) : 0
  );

function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildItemsHtml(products = []) {
  if (!Array.isArray(products) || products.length === 0) {
    return `<tr><td colspan="4" style="padding:16px;color:#9ca3af;font-size:13px;text-align:center;">Engar vörur.</td></tr>`;
  }

  return products.map((p) => {
    const type = p?.type;
    const d = p?.details || {};
    const qty = Number(d.quantity ?? 1) || 1;
    const price = typeof d.price === "number" ? d.price : null;
    const lineTotal = price != null ? price * qty : null;

    let title = "Vara";
    let meta = "";

    if (type === "cake") {
      title = escapeHtml(d.cake || "Kaka");
      if (d.size)      meta += `<div><b>Stærð:</b> ${escapeHtml(d.size)}</div>`;
      if (d.filling)   meta += `<div><b>Fylling:</b> ${escapeHtml(d.filling)}</div>`;
      if (d.bottom)    meta += `<div><b>Botn:</b> ${escapeHtml(d.bottom)}</div>`;
      if (d.smjorkrem) meta += `<div><b>Smjörkrem:</b> ${escapeHtml(d.smjorkrem)}</div>`;
      if (d.text)      meta += `<div><b>Texti:</b> ${escapeHtml(d.text)}</div>`;
      if (d.skreyting) meta += `<div><b>Skreyting:</b> ${escapeHtml(d.skreyting)}</div>`;
    } else if (type === "bite") {
      title = escapeHtml(d.name || "Smáréttur");
      if (d.description) meta += `<div style="color:#6b7280;">${escapeHtml(d.description)}</div>`;
    } else if (type === "bread") {
      title = `Brauð: ${escapeHtml(d.bread || "")}`;
    } else if (type === "minidonut") {
      title = "Mini-donuts";
    }

    return `
      <tr>
        <td style="padding:14px 0;border-top:1px solid #f3f4f6;">
          <div style="font-size:14px;color:#111827;font-weight:600;">${title}</div>
          ${meta ? `<div style="margin-top:4px;font-size:12px;color:#6b7280;line-height:1.5;">${meta}</div>` : ""}
        </td>
        <td style="padding:14px 0;border-top:1px solid #f3f4f6;text-align:right;font-size:13px;color:#374151;vertical-align:top;white-space:nowrap;">${qty} stk</td>
        <td style="padding:14px 0;border-top:1px solid #f3f4f6;text-align:right;font-size:13px;color:#374151;vertical-align:top;white-space:nowrap;">${price != null ? `${formatISK(price)} kr` : "–"}</td>
        <td style="padding:14px 0;border-top:1px solid #f3f4f6;text-align:right;font-size:13px;color:#111827;font-weight:700;vertical-align:top;white-space:nowrap;">${lineTotal != null ? `${formatISK(lineTotal)} kr` : "–"}</td>
      </tr>
    `;
  }).join("");
}

export async function sendOrderEmailBackend(order) {
  const itemsHtml = buildItemsHtml(order.products);
  const deliveryDate = order.date
    ? new Date(order.date).toLocaleDateString("is-IS", { day: "numeric", month: "long", year: "numeric" })
    : "–";

  const html = `
  <div style="background:#faf7f2;padding:32px 16px;font-family:Georgia,serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">

      <!-- Header -->
      <tr>
        <td style="background:#1c1917;border-radius:16px 16px 0 0;padding:28px 32px;">
          <div style="font-size:22px;font-weight:700;color:#f5f0e8;letter-spacing:0.5px;">Kallabakarí</div>
          <div style="margin-top:4px;font-size:13px;color:#c29979;letter-spacing:0.3px;">Greiðsla staðfest · Pöntun móttekin</div>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

          <div style="font-size:20px;font-weight:700;color:#1c1917;">Takk fyrir pöntunina, ${escapeHtml(order.name)}!</div>
          <div style="margin-top:8px;font-size:14px;color:#6b7280;line-height:1.6;">
            Við höfum móttekið pöntunina þína og greiðsla hefur verið staðfest. Við hlökkum til að sjá þig!
          </div>

          <!-- Divider -->
          <div style="margin:24px 0;border-top:1px solid #f3f4f6;"></div>

          <!-- Order info -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding:5px 0;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;width:150px;">Pöntunarnúmer</td>
              <td style="padding:5px 0;color:#374151;font-size:13px;">${escapeHtml(order.id)}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;">Afhendingardagur</td>
              <td style="padding:5px 0;color:#374151;font-size:13px;font-weight:600;">${deliveryDate}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;">Netfang</td>
              <td style="padding:5px 0;color:#374151;font-size:13px;">${escapeHtml(order.email)}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;">Sími</td>
              <td style="padding:5px 0;color:#374151;font-size:13px;">${escapeHtml(order.phone)}</td>
            </tr>
          </table>

          <!-- Divider -->
          <div style="margin:24px 0;border-top:1px solid #f3f4f6;"></div>

          <!-- Items heading -->
          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#9ca3af;margin-bottom:4px;">Vörur</div>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <th align="left" style="padding:8px 0;font-size:11px;color:#d1d5db;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #f3f4f6;">Lýsing</th>
              <th align="right" style="padding:8px 0;font-size:11px;color:#d1d5db;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #f3f4f6;white-space:nowrap;">Magn</th>
              <th align="right" style="padding:8px 0;font-size:11px;color:#d1d5db;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #f3f4f6;white-space:nowrap;">Verð/stk</th>
              <th align="right" style="padding:8px 0;font-size:11px;color:#d1d5db;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #f3f4f6;white-space:nowrap;">Samtals</th>
            </tr>
            ${itemsHtml}
          </table>

          <!-- Total -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
            <tr>
              <td style="padding:16px 0 0;border-top:2px solid #1c1917;font-size:15px;font-weight:700;color:#1c1917;">Heildarupphæð</td>
              <td colspan="3" style="padding:16px 0 0;border-top:2px solid #1c1917;text-align:right;font-size:18px;font-weight:700;color:#c29979;white-space:nowrap;">${formatISK(order.totalAmount)} kr</td>
            </tr>
          </table>

          ${order.user_message ? `
          <!-- Note -->
          <div style="margin-top:24px;padding:16px;background:#faf7f2;border-radius:10px;border-left:3px solid #c29979;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.6px;color:#9ca3af;margin-bottom:6px;">Athugasemdir</div>
            <div style="font-size:13px;color:#374151;line-height:1.6;">${escapeHtml(order.user_message)}</div>
          </div>
          ` : ""}

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#1c1917;border-radius:0 0 16px 16px;padding:20px 32px;">
          <div style="font-size:12px;color:#6b7280;text-align:center;">
            © ${new Date().getFullYear()} Kallabakarí · Þetta er sjálfvirkur staðfestingarpóstur.
          </div>
        </td>
      </tr>

    </table>
  </div>
  `;

  const text = `Takk fyrir pöntunina, ${order.name}!\nGreiðsla hefur verið staðfest.\n\nPöntunarnúmer: ${order.id}\nAfhendingardagur: ${deliveryDate}\nHeildarupphæð: ${formatISK(order.totalAmount)} kr\n`;

  const { data, error } = await resend.emails.send({
    from: "Kallabakarí <noreply@kallabakari.is>",
    to: [order.email],
    subject: `Pöntun staðfest – ${deliveryDate}`,
    html,
    text,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
  console.log("📧 Resend response:", data.id);
  return data;
}
