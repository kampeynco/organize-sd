import React, { useEffect, useRef, useState } from 'react';
import { MAX_VOICE_BYTES, MAX_VOICE_SECONDS, validateVoiceAnswer, type VoiceAnswer } from '../lib/voiceAnswer';

interface Props {
  value: VoiceAnswer | null;
  onChange: (voice: VoiceAnswer) => void;
  onBusyChange: (busy: boolean) => void;
}

export const VoiceAnswerRecorder: React.FC<Props> = ({ value, onChange, onBusyChange }) => {
  const [phase, setPhase] = useState<'idle' | 'requesting' | 'recording' | 'saving'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const [playbackUrl, setPlaybackUrl] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(true);
  const busy = useRef(false);
  const generation = useRef(0);
  const change = useRef(onChange);
  change.current = onChange;

  const release = () => {
    if (ticker.current) clearInterval(ticker.current);
    if (deadline.current) clearTimeout(deadline.current);
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
  };
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      generation.current++;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      release();
      onBusyChange(false);
    };
  }, [onBusyChange]);

  useEffect(() => {
    if (!value) { setPlaybackUrl(''); return; }
    const bytes = Uint8Array.from(atob(value.data), char => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: value.mimeType }));
    setPlaybackUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const start = async () => {
    if (busy.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice recording is unavailable in this browser. Please open this application in a current version of Safari, Chrome, or Firefox.');
      return;
    }
    busy.current = true;
    onBusyChange(true);
    setPhase('requesting');
    setError('');
    const session = ++generation.current;
    const finish = () => {
      if (session !== generation.current) return;
      release();
      busy.current = false;
      if (active.current && session === generation.current) {
        setPhase('idle');
        onBusyChange(false);
      }
    };
    try {
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (!active.current || session !== generation.current) { microphone.getTracks().forEach(track => track.stop()); return; }
      stream.current = microphone;
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error('unsupported');
      const recording = new MediaRecorder(microphone, { mimeType: mime, audioBitsPerSecond: 64000 });
      recorder.current = recording;
      const chunks: Blob[] = [];
      let byteCount = 0;
      let failed = false;
      const began = performance.now();
      let stoppedAt: number | null = null;
      const stop = () => {
        stoppedAt ??= performance.now();
        if (recording.state === 'recording') recording.stop();
      };
      // Exposed through the recorder's stop handler below; all stop paths release the microphone.
      recording.ondataavailable = event => {
        if (event.data.size) { chunks.push(event.data); byteCount += event.data.size; }
        if (byteCount > MAX_VOICE_BYTES) stop();
      };
      recording.onerror = () => {
        failed = true;
        if (active.current) setError('Recording was interrupted. Please record your answer again.');
        stop();
        finish();
      };
      recording.onstop = async () => {
        if (!active.current || session !== generation.current || failed) { finish(); return; }
        release();
        setPhase('saving');
        try {
          const durationMs = Math.min(MAX_VOICE_SECONDS * 1000, Math.round((stoppedAt ?? performance.now()) - began));
          const blob = new Blob(chunks, { type: recording.mimeType.split(';')[0] });
          if (blob.size > MAX_VOICE_BYTES) throw new Error('The recording is too large. Please try a shorter answer.');
          const data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('The recording could not be read. Please try again.'));
            reader.onload = () => resolve(String(reader.result).split(',')[1]);
            reader.readAsDataURL(blob);
          });
          const result = validateVoiceAnswer({ mimeType: blob.type, durationMs, data });
          if (result.error) throw new Error(result.error);
          if (active.current && session === generation.current) change.current(result.voice);
        } catch (failure) {
          if (active.current && session === generation.current) setError(failure instanceof Error ? failure.message : 'Please record your answer again.');
        } finally { finish(); }
      };
      recording.start(250);
      setSeconds(0);
      setPhase('recording');
      ticker.current = setInterval(() => setSeconds(Math.min(MAX_VOICE_SECONDS, Math.floor((performance.now() - began) / 1000))), 250);
      deadline.current = setTimeout(stop, MAX_VOICE_SECONDS * 1000);
    } catch (failure) {
      if (active.current && session === generation.current) {
        const name = failure instanceof Error ? failure.name : '';
        setError(name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Microphone access is blocked. Allow microphone access in your browser’s site settings, then try again.'
          : name === 'NotFoundError' ? 'No microphone was found. Connect a microphone and try again.'
          : 'The microphone could not start. Close other apps using it and try again.');
      }
      finish();
    }
  };

  const recording = phase === 'recording';
  return (
    <div className="rounded-2xl border-2 border-white/20 bg-white/5 p-5 sm:p-6 space-y-5">
      <p className="text-white/80">Aim for 30 seconds. You can record up to 60 seconds and listen before continuing.</p>
      <div className="flex flex-wrap items-center gap-4">
        {recording ? (
          <button type="button" onClick={() => recorder.current?.stop()} className="rounded-xl bg-white text-brand-ink px-6 py-3 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mint">
            Stop recording
          </button>
        ) : (
          <button type="button" onClick={start} disabled={phase !== 'idle'} className="rounded-xl bg-mint text-brand-ink px-6 py-3 font-bold disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mint">
            {phase === 'requesting' ? 'Waiting for microphone…' : phase === 'saving' ? 'Preparing recording…' : value ? 'Record again' : 'Record answer'}
          </button>
        )}
        {recording && <span className="text-white font-bold tabular-nums" role="timer" aria-label="Recording time">● {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} / 1:00</span>}
      </div>
      <p className="sr-only" role="status">{recording ? 'Recording started. Use Stop recording when finished.' : phase === 'saving' ? 'Preparing your recording.' : value ? 'Recording ready. Listen or record again.' : ''}</p>
      {playbackUrl && phase === 'idle' && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-mint">Your recording · {Math.round(value!.durationMs / 1000)} seconds</p>
          <audio controls preload="metadata" src={playbackUrl} aria-label="Listen to your voting pitch" className="w-full" />
        </div>
      )}
      {error && <p role="alert" className="text-rose-200">{error}</p>}
      <p className="text-sm text-white/60">Your recording is sent with your application when you submit. Closing or reloading this page clears unsent answers.</p>
    </div>
  );
};
