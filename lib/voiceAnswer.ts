export const MAX_VOICE_BYTES = 1_000_000;
export const MAX_VOICE_SECONDS = 60;
export const MAX_APPLICATION_BYTES = 1_600_000;
export const VOICE_MIME_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4'] as const;
export interface VoiceAnswer {
  mimeType: typeof VOICE_MIME_TYPES[number];
  data: string;
  durationMs: number;
}

export function validateVoiceAnswer(value: unknown): { voice: VoiceAnswer; error?: never } | { error: string; voice?: never } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'Please record your voting pitch before continuing.' };
  const voice = value as Record<string, unknown>;
  if (!VOICE_MIME_TYPES.includes(voice.mimeType as VoiceAnswer['mimeType']) || typeof voice.data !== 'string' ||
      typeof voice.durationMs !== 'number' || !Number.isInteger(voice.durationMs) || voice.durationMs < 1000 || voice.durationMs > MAX_VOICE_SECONDS * 1000) {
    return { error: 'Please record an answer between 1 and 60 seconds.' };
  }
  if (voice.data.length > Math.ceil(MAX_VOICE_BYTES / 3) * 4 || voice.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(voice.data)) {
    return { error: 'This recording is too large or could not be read. Please record it again.' };
  }
  const size = voice.data.length / 4 * 3 - (voice.data.endsWith('==') ? 2 : voice.data.endsWith('=') ? 1 : 0);
  if (size < 32 || size > MAX_VOICE_BYTES) return { error: 'This recording is empty or too large. Please record it again.' };
  // Inspect the container header in both browser and server. Audio is never served publicly.
  const header = atob(voice.data.slice(0, 32));
  const matches = voice.mimeType === 'audio/webm' ? header.startsWith('\x1a\x45\xdf\xa3')
    : voice.mimeType === 'audio/ogg' ? header.startsWith('OggS') : header.slice(4, 8) === 'ftyp';
  if (!matches) return { error: 'This recording could not be read. Please record it again.' };
  return { voice: { mimeType: voice.mimeType as VoiceAnswer['mimeType'], data: voice.data, durationMs: voice.durationMs } };
}
