/**
 * Outbound email.
 *
 * Provider is chosen from whatever credentials are present:
 *   RESEND_API_KEY                     → Resend (simplest; free tier covers this app)
 *   SMTP_HOST/_USER/_PASS              → any SMTP server, via nodemailer if installed
 *   neither                            → logged to the server console
 *
 * The console fallback is deliberate: password reset has to work the moment the
 * feature ships, before an email provider exists. The link is printed so it can
 * be followed by hand, and `delivered` comes back false so callers can surface
 * that nothing actually left the building.
 */

const FROM = process.env.MAIL_FROM || 'EquityIQ <onboarding@resend.dev>';

export interface SendResult {
  delivered: boolean;
  provider: 'resend' | 'smtp' | 'console';
  error?: string;
}

export function mailerConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER));
}

async function sendViaResend(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html, text }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { delivered: false, provider: 'resend', error: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }
    return { delivered: true, provider: 'resend' };
  } catch (err) {
    return { delivered: false, provider: 'resend', error: (err as Error).message };
  }
}

async function sendViaSmtp(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  try {
    // Optional dependency. The specifier is held in a variable so the build does
    // not require nodemailer to be installed unless SMTP is actually configured.
    const moduleName = 'nodemailer';
    const nodemailer: any = await import(moduleName).catch(() => null);
    if (!nodemailer) {
      return { delivered: false, provider: 'smtp', error: 'nodemailer is not installed (npm i nodemailer)' };
    }

    const transport = (nodemailer.default ?? nodemailer).createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transport.sendMail({ from: FROM, to, subject, html, text });
    return { delivered: true, provider: 'smtp' };
  } catch (err) {
    return { delivered: false, provider: 'smtp', error: (err as Error).message };
  }
}

export async function sendMail(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  if (process.env.RESEND_API_KEY) return sendViaResend(to, subject, html, text);
  if (process.env.SMTP_HOST && process.env.SMTP_USER) return sendViaSmtp(to, subject, html, text);

  console.warn(
    `\n📧 No email provider configured — printing instead of sending.\n   To: ${to}\n   Subject: ${subject}\n   ${text.replace(/\n/g, '\n   ')}\n`
  );
  return { delivered: false, provider: 'console' };
}

/* ── templates ──────────────────────────────────────────────────────────────── */

export function passwordResetEmail(name: string, link: string): { subject: string; html: string; text: string } {
  const subject = 'Reset your EquityIQ password';
  const text = `Hi ${name},\n\nUse this link to choose a new password. It expires in 1 hour.\n\n${link}\n\nIf you didn't ask for this, you can ignore this email — your password won't change.`;
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
  <h1 style="font-size:20px;margin:0 0 16px">Reset your password</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 12px">Hi ${escapeHtml(name)},</p>
  <p style="font-size:15px;line-height:1.6;margin:0 0 24px">Choose a new password with the button below. The link expires in 1&nbsp;hour.</p>
  <a href="${link}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;font-size:15px">Choose a new password</a>
  <p style="font-size:13px;line-height:1.6;color:#6b6b6b;margin:24px 0 0">Or paste this into your browser:<br><span style="word-break:break-all">${link}</span></p>
  <p style="font-size:13px;line-height:1.6;color:#6b6b6b;margin:20px 0 0">If you didn't ask for this, ignore this email — your password won't change.</p>
</div>`.trim();

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
