// Verify the active edit and record exact review times. No generation requests.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { TIMELINE } from '../timeline.mjs';
const root = new URL('../', import.meta.url).pathname;
const grid = JSON.parse(readFileSync(`${root}build/beats.json`));
const info = JSON.parse(readFileSync(`${root}build/clipinfo.json`));
const period = (grid.beats.at(-1) - grid.beats[0]) / (grid.beats.length - 1);
const beatTime = i => i === 0 ? 0 : i < grid.beats.length ? grid.beats[i]
  : grid.beats.at(-1) + (i - grid.beats.length + 1) * period;
const rejected = new Set(['field-steps','field-sidewalk','field-truck','field-apartment','field-doorstep',
  'field-campus','field-warroom','field-rain','field-snow','field-farmhouse','field-fairbooth',
  'train-roleplay','train-phones','train-trainer','train-turf','train-smallgroup',
  'win-carpool','win-walk','win-highfive','win-crowd','win-cheer','win-pepTalk','win-portrait',
  // third revision: the waitress diner, look-alike branding, the backwards sign-up sheet, the upscaled crop
  'field-diner','r2-trainer','r2-practice','r2-phone','r2-materials','r2-campus','r2-resident-close',
  // r3-campus as generated carries the white-backed logo on its tablecloth; r3-campus-print reprints it
  'r3-campus',
  // the first watch party's backdrop is plain; r4-watchparty carries the printed logo
  'r3-watchparty']);
const speech = JSON.parse(readFileSync(`${root}revision/speech.json`));  // [first word starts, last word ends], source seconds
const totalBeats = TIMELINE.reduce((n,s) => n+s.beats,0);
assert.equal(totalBeats,656);
const frame = beat => Math.round(Math.min(beatTime(beat),grid.duration)*24);
let beat=0;
const segments = TIMELINE.map((s,n) => {
  const start=frame(beat),end=frame(beat+s.beats);
  const entry={...s,n,beat,start,end,startSeconds:start/24,endSeconds:end/24,frames:end-start};
  beat+=s.beats;
  if(s.type==='clip') {
    assert(!rejected.has(s.id),`Rejected shot returned: ${s.id}`);
    assert(info[s.id],`Missing source information: ${s.id}`);
    assert((s.from??0)+(end-start)/24<=info[s.id].duration+1/24,`Source overrun: ${s.id}`);
    if(s.dialog) {
      const [first,last]=speech[s.id];
      assert((s.from??0)<=Math.max(0,first-0.05),`Speech opens mid-source: ${s.id}`);
      assert((s.from??0)+(end-start)/24>last+0.1,`Speech ending clipped: ${s.id}`);
    }
  }
  return entry;
});
const overlays=segments.flatMap(s=>[s.ov??[]].flat().map(o=>({start:s.beat+(o.at??0),end:s.beat+(o.at??0)+(o.beats??s.beats-(o.at??0))})));
for(const s of segments.filter(s=>s.type==='clip')) {
  assert(s.ov||overlays.some(o=>o.start<=s.beat&&o.end>=s.beat+s.beats),`No on-screen context: ${s.n} ${s.id}`);
}
const required=['r3-diner','r3-trainer','r3-practice','r3-phone','r3-materials','r3-campus-print','r2-doorstep',
  'r3-resident','r4-watchparty'];
// The kitchen table's frying pan stays out of frame.
for(const s of segments.filter(s=>s.id==='field-kitchen')) assert(s.frame&&s.frame[1]+s.frame[3]<=805,`Kitchen pan in frame: ${s.n}`);
for(const id of required) assert(segments.some(s=>s.id===id),`Missing replacement: ${id}`);
for(const s of segments.filter(s=>s.id==='r4-watchparty'))
  assert((s.from??0)+s.frames/24<=6.8,`Watch party runs into the high-fives: segment ${s.n}`);
writeFileSync(`${root}revision/edit-manifest.json`,JSON.stringify({totalBeats,frames:segments.at(-1).end,segments},null,2));
console.log(`PASS: ${segments.length} segments, ${totalBeats} beats, ${segments.at(-1).end} frames; rejected footage absent, every clip contextualized, full dialogue retained.`);
for(const id of required) {
  const s=segments.find(s=>s.id===id);
  console.log(`${id}: ${s.startSeconds.toFixed(3)}–${s.endSeconds.toFixed(3)}s`);
}
