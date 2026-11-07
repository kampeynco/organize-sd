// Text message opt-in language, shared by the signup card and /api/signup. The server stores
// SMS_CONSENT_RECORD with each opt-in as proof of exactly what the subscriber agreed to, so edit the
// wording here (never in the component) and every new opt-in records the updated text.
export const SMS_ORGANIZATION = 'Organize SD';

export const SMS_CONSENT_LABEL =
  `I consent to receive donation asks, contact, and informational messages from ${SMS_ORGANIZATION}.`;

export const SMS_DISCLOSURE =
  `By submitting this form and signing up for texts, you consent to receive contact, donation asks, ` +
  `and informational messages from ${SMS_ORGANIZATION}. Msg & data rates may apply. Msg frequency varies. ` +
  `Unsubscribe at any time by replying STOP. Text START to opt in. Text HELP for help.`;

export const SMS_TERMS_PATH = '/privacy#sms-terms';

export const SMS_CONSENT_RECORD =
  `Checkbox: ${SMS_CONSENT_LABEL}\nDisclosure: ${SMS_DISCLOSURE} Privacy Policy & SMS Terms: ${SMS_TERMS_PATH}`;

/** A US mobile number in E.164 form (+16055550123), or null if it is not a valid 10-digit NANP number. */
export function normalizeUsPhone(input: string): string | null {
  if (input.length > 32) return null;
  let digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return /^[2-9][0-9]{2}[2-9][0-9]{6}$/.test(digits) ? `+1${digits}` : null;
}

/** +16055550123 → (605) 555-0123 */
export function formatUsPhone(e164: string): string {
  const d = e164.slice(2);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
