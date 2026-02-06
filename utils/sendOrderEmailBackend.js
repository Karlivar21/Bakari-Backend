import { mailjet } from "./mailjet.js";

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

function lineLabelValue(label, value) {
  return `
    <tr>
      <td style="padding:4px 0;color:#6b7280;font-size:13px;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:4px 0;color:#111827;font-size:13px;">${escapeHtml(value || "-")}</td>
    </tr>
  `;
}

function buildItemsHtml(products = []) {
  if (!Array.isArray(products) || products.length === 0) {
    return `<tr><td style="padding:12px;color:#6b7280;font-size:13px;">Engar vörur.</td></tr>`;
  }

  const rows = products.map((p) => {
    const type = p?.type;
    const d = p?.details || {};
    const qty = Number(d.quantity ?? 1) || 1;
    const price = typeof d.price === "number" ? d.price : null;
    const lineTotal = price != null ? price * qty : null;

    let title = "Vara";
    let metaRows = "";

    if (type === "cake") {
      title = `Kaka: ${d.cake || ""}`;
      metaRows = `
        ${d.size ? `<div><b>Stærð:</b> ${escapeHtml(d.size)}</div>` : ""}
        ${d.filling ? `<div><b>Fylling:</b> ${escapeHtml(d.filling)}</div>` : ""}
        ${d.bottom ? `<div><b>Botn:</b> ${escapeHtml(d.bottom)}</div>` : ""}
        ${d.smjorkrem ? `<div><b>Smjörkrem:</b> ${escapeHtml(d.smjorkrem)}</div>` : ""}
        ${d.text ? `<div><b>Texti:</b> ${escapeHtml(d.text)}</div>` : ""}
        ${d.skreyting ? `<div><b>Skreyting:</b> ${escapeHtml(d.skreyting)}</div>` : ""}
      `;
    } else if (type === "bread") {
      title = `Brauð: ${d.bread || ""}`;
      metaRows = `<div><b>Magn:</b> ${escapeHtml(String(qty))}</div>`;
    } else if (type === "minidonut") {
      title = "Mini-donuts";
      metaRows = `<div><b>Magn:</b> ${escapeHtml(String(qty))}</div>`;
    }

    return `
      <tr>
        <td style="padding:14px 0;border-top:1px solid #e5e7eb;">
          <div style="font-size:14px;color:#111827;font-weight:700;">${escapeHtml(title)}</div>
          ${
            metaRows
              ? `<div style="margin-top:6px;font-size:13px;color:#374151;line-height:1.5;">${metaRows}</div>`
              : ""
          }
        </td>
        <td style="padding:14px 0;border-top:1px solid #e5e7eb;text-align:right;white-space:nowrap;font-size:13px;color:#111827;vertical-align:top;">
          ${qty} stk
        </td>
        <td style="padding:14px 0;border-top:1px solid #e5e7eb;text-align:right;white-space:nowrap;font-size:13px;color:#111827;vertical-align:top;">
          ${price != null ? `${formatISK(price)} kr` : "-"}
        </td>
        <td style="padding:14px 0;border-top:1px solid #e5e7eb;text-align:right;white-space:nowrap;font-size:13px;color:#111827;vertical-align:top;">
          ${lineTotal != null ? `<b>${formatISK(lineTotal)} kr</b>` : "-"}
        </td>
      </tr>
    `;
  });

  return rows.join("");
}

export async function sendOrderEmailBackend(order) {
  const itemsHtml = buildItemsHtml(order.products);

  const subject = "Greiðsla staðfest – pöntun móttekin";

  const html = `
  <div style="background:#f3f4f6;padding:24px 12px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
      
      <!-- Header -->
      <tr>
        <td style="padding:20px 22px;background:#111827;">
          <div style="font-size:16px;font-weight:800;color:#ffffff;letter-spacing:.2px;">Kallabakarí</div>
          <div style="margin-top:4px;font-size:13px;color:#d1d5db;">Greiðsla staðfest – pöntun móttekin</div>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:22px;">
          <div style="font-size:18px;font-weight:800;color:#111827;">Takk fyrir pöntunina, ${escapeHtml(order.name)} 👋</div>
          <div style="margin-top:6px;font-size:13px;color:#6b7280;line-height:1.5;">
            Við höfum móttekið pöntunina þína og greiðsla hefur verið staðfest.
          </div>

          <!-- Order meta -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:14px;">
            ${lineLabelValue("Pöntunarnúmer", order.id)}
            ${lineLabelValue("Afhendingardagur", order.date ? new Date(order.date).toISOString().slice(0,10) : "-")}
            ${lineLabelValue("Netfang", order.email)}
            ${lineLabelValue("Sími", order.phone)}
          </table>

          <!-- Items -->
          <div style="margin-top:18px;font-size:14px;font-weight:800;color:#111827;">Vörur</div>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:10px;">
            <tr>
              <th align="left" style="padding:10px 0;font-size:12px;color:#6b7280;font-weight:700;">Lýsing</th>
              <th align="right" style="padding:10px 0;font-size:12px;color:#6b7280;font-weight:700;white-space:nowrap;">Magn</th>
              <th align="right" style="padding:10px 0;font-size:12px;color:#6b7280;font-weight:700;white-space:nowrap;">Verð</th>
              <th align="right" style="padding:10px 0;font-size:12px;color:#6b7280;font-weight:700;white-space:nowrap;">Samtals</th>
            </tr>
            ${itemsHtml}
          </table>

          <!-- Total -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:14px;">
            <tr>
              <td style="padding-top:12px;border-top:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:800;">Samtals</td>
              <td style="padding-top:12px;border-top:1px solid #e5e7eb;color:#111827;font-size:14px;font-weight:800;text-align:right;white-space:nowrap;">
                ${formatISK(order.totalAmount)} kr
              </td>
            </tr>
          </table>

          ${
            order.user_message
              ? `
              <div style="margin-top:16px;padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
                <div style="font-size:12px;color:#6b7280;font-weight:700;">Auka athugasemdir</div>
                <div style="margin-top:6px;font-size:13px;color:#111827;line-height:1.5;">${escapeHtml(order.user_message)}</div>
              </div>
              `
              : ""
          }

          <div style="margin-top:18px;font-size:13px;color:#6b7280;line-height:1.5;">
            Ef eitthvað þarf að breyta, svaraðu þessum pósti eða hafðu samband við okkur.
          </div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:16px 22px;background:#f9fafb;border-top:1px solid #e5e7eb;">
          <div style="font-size:12px;color:#6b7280;">
            © ${new Date().getFullYear()} Kallabakarí · Þetta er sjálfvirkur staðfestingarpóstur.
          </div>
        </td>
      </tr>
    </table>
  </div>
  `;

  const text = `Takk fyrir pöntunina, ${order.name}
Greiðsla hefur verið staðfest.

Pöntunarnúmer: ${order.id}
Samtals: ${order.totalAmount} kr
`;

  const requestData = {
    Messages: [
      {
        From: { Email: "noreply@kallabakari.is", Name: "Kallabakarí" },
        To: [
          { Email: order.email, Name: order.name },
          // optional admin copy:
          // { Email: "pantanir@kallabakari.is", Name: "Kallabakarí" },
        ],
        Subject: subject,
        TextPart: text,
        HTMLPart: html,
      },
    ],
  };

  const response = await mailjet.post("send", { version: "v3.1" }).request(requestData);
  console.log("📧 Mailjet response:", JSON.stringify(response.body, null, 2));
  return response.body;
}
