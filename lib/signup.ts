export type SignupSource = 'hero' | 'newsletter' | 'sticky';

/** Optional text message opt-in. The phone is only sent when the subscriber checked the consent box. */
export interface SmsOptIn {
  phone: string;
  consent: boolean;
}

/** Save an email + ZIP signup. Throws an Error with a user-facing message on failure. */
export async function submitSignup(
  source: SignupSource, email: string, zip: string, company = '', sms?: SmsOptIn,
): Promise<void> {
  const body: Record<string, unknown> = { source, email, zip, company };
  if (sms && (sms.phone.trim() !== '' || sms.consent)) {
    body.phone = sms.phone;
    body.smsConsent = sms.consent;
  }
  let res: Response;
  try {
    res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
}
