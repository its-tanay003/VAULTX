/**
 * Shared HTML email wrapper.
 * Inline styles only — email clients strip <style> tags.
 * Tested against Gmail, Outlook, Apple Mail.
 */

export function emailBase({
  title,
  previewText,
  body,
}: {
  title:       string;
  previewText: string;
  body:        string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <!-- Preview text (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;color:#09090b;">
    ${escHtml(previewText)}&nbsp;&#847;
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0d1f1e;border:1px solid #1a3b38;border-radius:10px;padding:8px 12px;">
                    <span style="color:#2dd4bf;font-weight:600;font-size:15px;letter-spacing:-0.3px;">⬡ VAULTX</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#111113;border:1px solid #27272a;border-radius:12px;padding:32px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;color:#52525b;font-size:12px;line-height:1.6;">
                You're receiving this because you have an account on
                <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://vaultx.io'}" style="color:#2dd4bf;text-decoration:none;">VAULTX</a>.
                <br/>
                <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://vaultx.io'}/dashboard/settings/notifications"
                   style="color:#71717a;text-decoration:underline;">Manage notification preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ─── Shared HTML primitives ──────────────────────────────────────────────── */

export function emailH1(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#fafafa;line-height:1.3;">${escHtml(text)}</h1>`;
}

export function emailP(text: string, muted = false): string {
  const color = muted ? "#71717a" : "#a1a1aa";
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${color};">${text}</p>`;
}

export function emailBadge(text: string, color: "teal"|"red"|"yellow"|"green"|"zinc"): string {
  const MAP = {
    teal:   { bg:"#0d2b29", border:"#1a4340", text:"#2dd4bf" },
    red:    { bg:"#2d0a0a", border:"#5c1414", text:"#f87171" },
    yellow: { bg:"#2d2007", border:"#5c3e0a", text:"#fbbf24" },
    green:  { bg:"#0a2d12", border:"#145c24", text:"#4ade80" },
    zinc:   { bg:"#18181b", border:"#27272a", text:"#a1a1aa" },
  };
  const c = MAP[color];
  return `<span style="display:inline-block;background:${c.bg};border:1px solid ${c.border};color:${c.text};font-size:11px;font-weight:500;padding:2px 8px;border-radius:20px;">${escHtml(text)}</span>`;
}

export function emailDivider(): string {
  return `<div style="border-top:1px solid #27272a;margin:20px 0;"></div>`;
}

export function emailButton(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#2dd4bf;color:#09090b;font-weight:600;font-size:14px;padding:10px 24px;border-radius:8px;text-decoration:none;margin-top:8px;">${escHtml(text)}</a>`;
}

export function emailMeta(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:13px;color:#71717a;width:120px;vertical-align:top;">${escHtml(label)}</td>
    <td style="padding:6px 0;font-size:13px;color:#a1a1aa;font-weight:500;">${value}</td>
  </tr>`;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#039;");
}
