export async function submitApplication(submissionId: string, answers: Record<string, string>): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, answers }),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new Error('Could not confirm your application was saved. Check your connection and try again.');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok !== true || data?.id !== submissionId) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Could not confirm your application was saved. Please try again.');
  }
}
