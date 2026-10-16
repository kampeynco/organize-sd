export type SignupSource = 'hero' | 'newsletter' | 'sticky';

/** Save an email + ZIP signup. Throws an Error with a user-facing message on failure. */
export async function submitSignup(source: SignupSource, email: string, zip: string, company = ''): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, email, zip, company }),
    });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
}
