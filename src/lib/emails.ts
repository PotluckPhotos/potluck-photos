// Branded, email-client-safe HTML (tables + inline styles, absolute image URLs).
// Used for album invites. The signup-confirmation email lives in Supabase's
// dashboard template — see supabase/email-templates/confirm-signup.html.

const ACCENT = "#FF6B6B";
const PAGE_BG = "#FFF8F2";
const TEXT = "#2B1810";
const MUTED = "#8a6f5e";
const TINT = "#FDEAE4";

export function inviteEmailHtml(opts: {
  albumName: string;
  code: string;
  inviter: string;
  siteUrl: string;
  logoUrl: string;
}): string {
  const { albumName, code, inviter, siteUrl, logoUrl } = opts;
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:${PAGE_BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG};padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="width:440px;max-width:92%;background:#ffffff;border-radius:20px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;">
        <tr><td align="center" style="padding:28px 32px 8px;">
          <img src="${logoUrl}" alt="Potluck Photos" width="150" style="display:block;width:150px;height:auto;" />
        </td></tr>
        <tr><td align="center" style="padding:8px 32px 0;">
          <h1 style="margin:0;font-size:22px;color:${TEXT};font-weight:700;">You&rsquo;re invited to add photos</h1>
          <p style="margin:10px 0 0;font-size:15px;color:${MUTED};line-height:1.5;">
            ${escapeHtml(inviter)} invited you to the <strong style="color:${TEXT};">${escapeHtml(albumName)}</strong> album on Potluck Photos.
          </p>
        </td></tr>
        <tr><td align="center" style="padding:24px 32px 4px;">
          <div style="font-size:12px;letter-spacing:1px;color:${MUTED};text-transform:uppercase;">Your join code</div>
          <div style="margin-top:8px;background:${TINT};border-radius:14px;padding:16px 24px;display:inline-block;">
            <span style="font-size:34px;font-weight:700;letter-spacing:8px;color:${ACCENT};">${escapeHtml(code)}</span>
          </div>
        </td></tr>
        <tr><td align="center" style="padding:16px 32px 0;">
          <p style="margin:0;font-size:14px;color:${TEXT};line-height:1.6;">
            Go to <a href="${siteUrl}" style="color:${ACCENT};font-weight:700;text-decoration:none;">${stripProtocol(siteUrl)}</a>,
            sign in, and enter this code under &ldquo;Join with a code.&rdquo;
          </p>
        </td></tr>
        <tr><td align="center" style="padding:24px 32px 28px;">
          <p style="margin:0;font-size:12px;color:${MUTED};">Didn&rsquo;t expect this? You can ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
