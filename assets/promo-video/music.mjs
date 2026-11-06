// Generates the soundtrack with Suno V6 on kie.ai. Suno returns two takes; both land in audio/.
//   node music.mjs            generate (skips if audio/score-1.mp3 exists)
//   node music.mjs --redo     generate new takes
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createTask, download, waitForTask } from './lib/kie.mjs';

const AUDIO = new URL('./audio/', import.meta.url).pathname;
mkdirSync(AUDIO, { recursive: true });
if (existsSync(`${AUDIO}score-1.mp3`) && !process.argv.includes('--redo')) {
  console.log('audio/score-1.mp3 exists; pass --redo to generate new takes');
  process.exit(0);
}

const taskId = await createTask('ai-music-api/generate', {
  custom_mode: true,
  instrumental: true,
  model: 'V6',
  title: 'Train Organize Win',
  duration: 300,
  style:
    'Anthemic cinematic heartland rock meets modern electronic, 124 BPM, driving four-on-the-floor kick, stomp-clap ' +
    'percussion, chugging palm-muted electric guitars, pulsing synth arpeggios, big tom fills, soaring instrumental ' +
    'lead melody, hopeful and urgent, wide-open prairie feel. Builds in waves: atmospheric intro, steady build, ' +
    'explosive drop, breakdown, bigger build, triumphant final chorus, clean ending. Instrumental only.',
  negative_tags: 'vocals, singing, choir, spoken word, lo-fi, sad, slow, jazz, country twang',
  style_weight: 0.8,
});
console.log(`submitted ${taskId}`);

const info = await waitForTask(taskId, { onTick: (i) => process.stdout.write(`${i.state} `) });
if (info.state !== 'success') throw new Error(`music failed: ${info.failCode} ${info.failMsg}`);

const result = info.response ?? JSON.parse(info.resultJson || '{}');
const tracks = result.data ?? result.resultObject?.data ?? [];
writeFileSync(`${AUDIO}score.json`, JSON.stringify(info, null, 2));
if (!tracks.length) throw new Error(`no tracks in result; see audio/score.json`);
for (const [i, t] of tracks.entries()) {
  await download(t.audio_url, `${AUDIO}score-${i + 1}.mp3`);
  console.log(`\n✓ audio/score-${i + 1}.mp3 (${t.duration}s)`);
}
console.log(`${info.creditsConsumed} credits`);
