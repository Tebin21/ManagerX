import { config } from './config';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export async function sendOtpEmail(to: string, code: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!config.resendApiKey) {
    console.error('sendOtpEmail: RESEND_API_KEY is not configured');
    return { ok: false, reason: 'not_configured' };
  }

  const subject = 'Verify your Froshiar account';
  const text =
    `Your verification code is:\n\n${code}\n\n` +
    `This code expires in 10 minutes.\n\n` +
    `If you did not create this account, you can ignore this email.`;
  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
      <h2 style="margin: 0 0 12px;">Verify your Froshiar account</h2>
      <p style="font-size: 15px; color: #374151;">Your verification code is:</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 16px 0;">${code}</p>
      <p style="font-size: 13px; color: #6B7280;">This code expires in 10 minutes.</p>
      <p style="font-size: 12px; color: #9CA3AF; margin-top: 24px;">If you did not create this account, you can ignore this email.</p>
    </div>
  `;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.resendFromAddress,
        to: [to],
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      // Never log the response body — it can echo the recipient/subject back.
      // The status code alone is enough to diagnose a provider-side failure.
      console.error(`sendOtpEmail: Resend responded ${res.status}`);
      return { ok: false, reason: `resend_${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error('sendOtpEmail: network error contacting Resend', e instanceof Error ? e.message : String(e));
    return { ok: false, reason: 'network_error' };
  }
}

// Distinct subject/wording from sendOtpEmail above — this is the password-reset
// flow's own template, never reused for signup/email-verification, so a user
// can't confuse the two emails.
export async function sendPasswordResetOtpEmail(to: string, code: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!config.resendApiKey) {
    console.error('sendPasswordResetOtpEmail: RESEND_API_KEY is not configured');
    return { ok: false, reason: 'not_configured' };
  }

  const subject = 'Reset your Froshiar password';
  const text =
    `Your password reset code is:\n\n${code}\n\n` +
    `This code expires in 10 minutes.\n\n` +
    `If you did not request a password reset, you can safely ignore this email — your password will not be changed.`;
  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
      <h2 style="margin: 0 0 12px;">Reset your Froshiar password</h2>
      <p style="font-size: 15px; color: #374151;">Your password reset code is:</p>
      <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 16px 0;">${code}</p>
      <p style="font-size: 13px; color: #6B7280;">This code expires in 10 minutes.</p>
      <p style="font-size: 12px; color: #9CA3AF; margin-top: 24px;">If you did not request a password reset, you can safely ignore this email — your password will not be changed.</p>
    </div>
  `;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.resendFromAddress,
        to: [to],
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      // Never log the response body — it can echo the recipient/subject back.
      console.error(`sendPasswordResetOtpEmail: Resend responded ${res.status}`);
      return { ok: false, reason: `resend_${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error('sendPasswordResetOtpEmail: network error contacting Resend', e instanceof Error ? e.message : String(e));
    return { ok: false, reason: 'network_error' };
  }
}
