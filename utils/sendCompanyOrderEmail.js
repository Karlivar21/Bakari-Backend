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

function formatProductLine(p) {
  const d = p?.details || {};
  const qty = Number(d.quantity ?? 1) || 1;
  switch (p?.type) {
    case 'cake':      return `${d.cake || 'Kaka'}${d.size ? ` (${d.size})` : ''}${d.filling ? `, ${d.filling}` : ''}`;
    case 'bread':     return `Brauð: ${d.bread || ''} × ${qty}`;
    case 'minidonut': return `Minidonuts × ${qty}`;
    case 'bakkelsi':  return `${d.name || 'Bakkelsi'} × ${qty}`;
    case 'salat':     return `${d.name || 'Salat'} × ${qty}`;
    case 'supa':      return `${d.name || 'Súpa dagsins'} × ${qty}`;
    case 'eldhus':    return `${d.name || 'Úr eldhúsi'} × ${qty}`;
    default:          return `${d.name || d.other || 'Vara'} × ${qty}`;
  }
}

function buildRowsHtml(products = []) {
  if (!products.length) return `<tr><td colspan="2" style="padding:12px;color:#9ca3af;font-size:13px;">Engar vörur.</td></tr>`;
  return products.map(p => `
    <tr>
      <td style="padding:10px 0;border-top:1px solid #f3f4f6;font-size:14px;color:#111827;">${escapeHtml(formatProductLine(p))}</td>
    </tr>
  `).join('');
}

export async function sendCompanyOrderEmail({ order, company }) {
  const deliveryDate = order.date
    ? new Date(order.date).toLocaleDateString('is-IS', { day: 'numeric', month: 'long', year: 'numeric' })
    : '–';

  const deliveryType = order.deliveryType === 'delivery' ? 'Afhending' : 'Sækja';

  const html = `
  <div style="background:#faf7f2;padding:32px 16px;font-family:Georgia,serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;">

      <tr>
        <td style="background:#1c1917;border-radius:16px 16px 0 0;padding:28px 32px;">
          <div style="font-size:22px;font-weight:700;color:#f5f0e8;letter-spacing:0.5px;">Kallabakarí</div>
          <div style="margin-top:4px;font-size:13px;color:#c29979;">Pöntun móttekin</div>
        </td>
      </tr>

      <tr>
        <td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">

          <div style="font-size:20px;font-weight:700;color:#1c1917;">Takk fyrir pöntunina, ${escapeHtml(company.name)}!</div>
          <div style="margin-top:8px;font-size:14px;color:#6b7280;line-height:1.6;">
            Við höfum móttekið pöntunina ykkar. Við hlökkum til að sjá ykkur!
          </div>

          <div style="margin:24px 0;border-top:1px solid #f3f4f6;"></div>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding:5px 0;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;width:160px;">Dagsetning</td>
              <td style="padding:5px 0;color:#374151;font-size:13px;font-weight:600;">${deliveryDate}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:0.6px;">Afhending</td>
              <td style="padding:5px 0;color:#374151;font-size:13px;">${deliveryType}${order.pickupTime ? ` kl. ${escapeHtml(order.pickupTime)}` : ''}</td>
            </tr>
          </table>

          <div style="margin:24px 0;border-top:1px solid #f3f4f6;"></div>

          <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.6px;color:#9ca3af;margin-bottom:4px;">Vörur</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${buildRowsHtml(order.products)}
          </table>

          ${order.totalAmount > 0 ? `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
            <tr>
              <td style="padding:16px 0 0;border-top:2px solid #1c1917;font-size:15px;font-weight:700;color:#1c1917;">Heildarupphæð</td>
              <td style="padding:16px 0 0;border-top:2px solid #1c1917;text-align:right;font-size:18px;font-weight:700;color:#c29979;">${formatISK(order.totalAmount)} kr</td>
            </tr>
          </table>
          ` : ''}

          ${order.note ? `
          <div style="margin-top:24px;padding:16px;background:#faf7f2;border-radius:10px;border-left:3px solid #c29979;">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.6px;color:#9ca3af;margin-bottom:6px;">Athugasemdir</div>
            <div style="font-size:13px;color:#374151;line-height:1.6;">${escapeHtml(order.note)}</div>
          </div>
          ` : ''}

        </td>
      </tr>

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

  const text = `Takk fyrir pöntunina, ${company.name}!\n\nDagsetning: ${deliveryDate}\nAfhending: ${deliveryType}${order.pickupTime ? ` kl. ${order.pickupTime}` : ''}\n\nVörur:\n${order.products.map(p => `- ${formatProductLine(p)}`).join('\n')}\n${order.totalAmount > 0 ? `\nHeildarupphæð: ${formatISK(order.totalAmount)} kr` : ''}`;

  const { data, error } = await resend.emails.send({
    from: 'Kallabakarí <noreply@kallabakari.is>',
    to: [company.email],
    subject: `Pöntun móttekin – ${deliveryDate}`,
    html,
    text,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
  console.log('📧 Company order email sent:', data.id);
  return data;
}
