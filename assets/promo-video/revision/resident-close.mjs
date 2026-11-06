// Reframe the retained conversation around the resident; preserve original audio.
import { execFileSync } from 'node:child_process';
const root = new URL('../', import.meta.url).pathname;
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${root}clips/field-doorstep.mp4`,
  '-vf', "crop=800:450:1120-20*t:150-8*t,scale=1920:1080:flags=lanczos",
  '-c:v', 'libx264', '-preset', 'fast', '-crf', '16', '-pix_fmt', 'yuv420p',
  '-c:a', 'copy', `${root}clips/r2-resident-close.mp4`], { stdio: 'inherit' });
