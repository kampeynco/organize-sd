// The edit: an ordered list of segments, each lasting a whole number of beats of the score.
// clip(id, beats, opts)  — footage from clips/<id>.mp4
//    from: start time in the source (s)   gain: ambience level (default 0.16)   dialog: true → full level, music ducks
//    ov: overlay(s) drawn on top — { scene, params, at: beats in, beats: length (may run past the segment) }
// gfx(scene, beats, params) — a full-screen motion-graphics card
// Section notes give the score's shape (audio/score-2.mp3, ~131.6 BPM): see `node beats.mjs`.

export const SCORE = 'audio/score-2.mp3';

const clip = (id, beats, opts = {}) => ({ type: 'clip', id, beats, ...opts });
const gfx = (scene, beats, params, opts = {}) => ({ type: 'gfx', scene, beats, params, ...opts });
const big = (lines, opts = {}) => ({ scene: 'bigover', params: { lines, ...opts } });
const lower = (kicker, text, opts = {}) => ({ scene: 'lower', params: { kicker, text }, ...opts });
const O = '#ff8a3d'; // signal orange
// Region of field-fairbooth (x, y, w, h in 1920×1080) holding the "YAGU" carnival sign; set from OCR boxes
const FAIR_SIGN = [[1630, 0, 290, 220]];

export const TIMELINE = [
  // ── Cold open: the land (intro, beats 0–40) ────────────────────────────────────────────────────
  clip('land-prairie', 8, { from: 0, gain: 0.5, ov: big([{ text: 'SOUTH DAKOTA.', size: 230 }], { shade: 0.3 }), fadeIn: 0.6 }),
  clip('land-badlands', 8, { from: 0.4, gain: 0.4, ov: big([{ text: '77,116', size: 300, color: O }, { text: 'SQUARE MILES', size: 110 }]) }),
  clip('land-blackhills', 8, { from: 0.4, gain: 0.4, ov: big([{ text: '66', size: 330, color: O }, { text: 'COUNTIES', size: 110 }]) }),
  clip('land-mainstreet', 8, { from: 0.4, gain: 0.4, ov: big([{ text: 'HUNDREDS OF', size: 120 }, { text: 'SMALL TOWNS', size: 200, color: O }]) }),
  clip('land-porchlights', 8, { from: 0.2, gain: 0.5, ov: big([{ text: 'AND A WHOLE LOT OF', size: 110 }, { text: 'FRONT DOORS.', size: 230, color: O }]) }),

  // ── The argument (build begins, beats 40–64) ───────────────────────────────────────────────────
  gfx('statement', 8, { lines: [['ELECTIONS', 'AREN’T', 'WON'], ['ON', 'TV.']], accent: ['TV.'], wordAt: 0.36 }),
  clip('field-steps', 4, { from: 0.5 }),
  clip('field-sidewalk', 4, { from: 0.8 }),
  gfx('statement', 8, { lines: [['THEY’RE', 'WON', 'ONE'], ['CONVERSATION'], ['AT', 'A', 'TIME.']], accent: ['CONVERSATION'], wordAt: 0.3, size: 150 }),

  // ── 01 TRAIN (beats 64–224) ────────────────────────────────────────────────────────────────────
  gfx('slam', 8, { word: 'TRAIN.', num: '01 / 03', kicker: 'Three-day weekend intensive' }, { hit: true }),
  clip('train-arrive', 6, { from: 0.3, gain: 0.3, ov: lower('Friday through Sunday', 'The weekend intensive') }),
  // her line "Every conversation counts. Let's go again!" runs 1.3–7.25s
  clip('train-trainer', 14, { from: 1.15, dialog: true, ov: lower('Led by', 'Obama-era field organizers', { at: 2, beats: 8 }) }),
  clip('train-turf', 4, { from: 0.5 }),
  // the whole exchange, through the farmer's "Yes, I suppose I do." (7.04s)
  // mute: she slips a stray "Witte" between "…up the road." and "got a minute?"
  clip('train-roleplay', 16, { from: 0, dialog: true, mute: [[1.94, 2.35]], ov: lower('Hands-on practice', 'Roleplays. Scripts. Turf plans.', { at: 4, beats: 8 }) }),
  // dip in the score (beats 112–128); three takes of a live snowflake drawing all had gibberish labels, so the
  // animated graphic carries it alone
  gfx('snowflake', 24, { captions: ['One organizer.', 'Builds leaders.', 'Who build teams.', 'That reach every door.'] }),
  clip('train-smallgroup', 8, { from: 4.2, ov: lower('You leave with', 'Turf plans. Contact goals. Systems.') }),
  clip('train-turf', 4, { from: 6.0 }), // 4.5–6.0 is a tangle of hands
  clip('train-arrive', 4, { from: 6.15 }),
  clip('train-phones', 12, { from: 1.5, dialog: true }), // "Hi! I'm a volunteer right here in Brookings." (3.44–6.54s)
  clip('land-falls', 8, { from: 4.2, gain: 0.3, ov: lower('Then you go home', 'And build a team.', { beats: 14 }) }),
  clip('land-mainstreet', 8, { from: 4.2, gain: 0.3 }),
  clip('land-farmstead', 8, { from: 0.3, gain: 0.3 }),
  clip('field-diner', 16, { from: 0.4, ov: lower('One-on-ones', 'Recruit your first volunteers.', { beats: 8 }) }),
  clip('train-smallgroup', 4, { from: 2 }),
  clip('train-graduate', 16, { from: 0, dialog: true }), // "Now go organize!" then applause; no hugging

  // ── 02 ORGANIZE (beats 224–428) ────────────────────────────────────────────────────────────────
  gfx('slam', 8, { word: 'ORGANIZE.', num: '02 / 03', kicker: 'Right where you live', size: 400 }, { hit: true }),
  // from 2.0s: the rancher's cap changes color while he's still far off before that
  clip('field-farmhouse', 8, { from: 2.0, gain: 0.3, ov: lower('Organize', 'Recruit volunteers.') }),
  clip('field-sidewalk', 4, { from: 4.2 }), // up the front path to the door
  clip('field-steps', 4, { from: 4.2 }),
  // 13 beats so the dad finishes "...finding affordable daycare options." (5.56s)
  clip('field-apartment', 13, { from: 0, dialog: true, ov: lower('Organize', 'Reach voters.', { at: 4, beats: 8 }) }),
  // the host's off-topic talk ("projections for next quarter") stays under the music
  clip('field-kitchen', 8, { from: 0.4, gain: 0.06, ov: lower('Organize', 'Build teams that last.') }),
  clip('field-steps', 4, { from: 2.4 }), // field-textbank's sweatshirt prints a misspelled "UNIVERSITY" in every frame
  clip('field-campus', 4, { from: 0.5 }),
  // a carnival sign in the top-right corner spells "YAGU"; gibberish print appears on her polo from 4.3s
  clip('field-fairbooth', 7, { from: 0.4, gain: 0.25, blur: FAIR_SIGN }),
  clip('field-truck', 4, { from: 0.3, gain: 0.3 }),
  clip('field-rain', 8, { from: 2.2, gain: 0.3 }), // before 2.2s she keeps knocking with the man already there
  clip('field-snow', 4, { from: 1.7, gain: 0.3, ov: lower('Every season', 'Rain, shine, or snow.', { beats: 4 }) }), // he works the door handle himself before 1.6s
  // Breakdown (beats 300–328): the music drops out, the conversation carries it
  clip('field-doorstep', 16, { from: 0.2, dialog: true }),
  clip('field-porch', 5, { from: 2.1, dialog: true }), // "Come back anytime, son." Laughter before Kling's cut at 2.04s
  clip('field-elder', 7, { from: 0, dialog: true }), // "My grandfather used to say that the prairie has a memory."
  // Chorus 2 (beats 328–428)
  clip('field-truck', 4, { from: 2.2 }),
  clip('field-campus', 4, { from: 4.1, gain: 0 }), // laughter at 5s; smeared extra hands sweep in from 6.0s
  clip('field-rain', 4, { from: 6.0 }),
  clip('field-kitchen', 4, { from: 4.5, gain: 0.06 }),
  clip('field-warroom', 8, { from: 0.4, gain: 0.3 }),
  clip('field-farmhouse', 4, { from: 5.8 }),
  clip('field-apartment', 4, { from: 5 }),
  clip('field-truck', 4, { from: 4.5 }),
  clip('field-sidewalk', 4, { from: 2.5 }),
  clip('field-elder', 8, { from: 3.6, gain: 0.3 }),
  clip('field-snow', 4, { from: 4.0 }),
  gfx('map', 16, { kicker: 'From Sioux Falls to the Black Hills', text: 'Every county. Every door.' }),
  clip('field-warroom', 4, { from: 4.5 }),
  clip('field-fairbooth', 4, { from: 2.4, blur: FAIR_SIGN }),
  clip('field-campus', 4, { from: 2.5 }),
  clip('field-porch', 4, { from: 6 }),
  clip('field-doorstep', 4, { from: 6.2 }),
  clip('field-warroom', 4, { from: 6.2 }),
  clip('land-storm', 8, { from: 0.3, gain: 0.5 }),

  // ── The turn (break, beats 428–456) ────────────────────────────────────────────────────────────
  clip('land-windmill', 8, { from: 0.3, gain: 0.5, ov: big([{ text: 'BUILDING FOR', size: 120 }, { text: '2028', size: 330, color: O }, { text: 'AND BEYOND.', size: 120 }]) }),
  clip('win-portrait', 12, { from: 0.4, gain: 0.4 }),
  clip('win-rancher', 8, { from: 2, gain: 0.4 }), // a stray hand fills the first second

  // ── 03 WIN (beats 456–572) ─────────────────────────────────────────────────────────────────────
  gfx('slam', 8, { word: 'WIN.', num: '03 / 03', kicker: '2028 and beyond', size: 560 }, { hit: true }),
  // 14 beats so "Let's go!" lands in the close-up after Kling's internal cut at 5.08s
  clip('win-pepTalk', 14, { from: 0, dialog: true }),
  clip('win-carpool', 6, { from: 0.4, gain: 0.3, ov: lower('By November 2028', 'More trained organizers.') }),
  clip('win-walk', 8, { from: 0.3, gain: 0, ov: lower('By November 2028', 'Stronger volunteer teams.') }), // laughter 2.5–4s
  clip('win-highfive', 8, { from: 1.4, gain: 0.35, ov: lower('By November 2028', 'Better voter conversations.') }), // two teammates walk in at 1.0s
  clip('win-crowd', 8, { from: 0.2, gain: 0.5 }),
  clip('land-flag', 4, { from: 0.4 }),
  clip('win-cheer', 8, { from: 0, gain: 0.5 }), // they stand and throw their arms up
  // Bridge (beats 520–572)
  clip('land-falls', 8, { from: 0.3, gain: 0.4 }),
  clip('land-harvest', 8, { from: 0.3, gain: 0.4, ov: big([{ text: 'IT STARTS WITH', size: 120 }, { text: 'ONE WEEKEND.', size: 230, color: O }]) }),
  clip('train-graduate', 8, { from: 4.35, gain: 0.4 }),
  clip('win-walk', 8, { from: 4.4, gain: 0 }),
  clip('win-dawn', 8, { from: 4.4, ov: big([{ text: 'AND ONE', size: 120 }, { text: 'CONVERSATION', size: 220, color: O }, { text: 'AT A TIME.', size: 120 }]) }),
  clip('win-portrait', 4, { from: 6 }),
  clip('win-rancher', 4, { from: 5.5 }),
  clip('land-prairie', 4, { from: 5 }),
  // Riser (beats 572–584): cuts accelerate
  clip('train-trainer', 2, { from: 2 }),
  clip('field-farmhouse', 2, { from: 6.8 }),
  clip('field-doorstep', 2, { from: 4 }),
  clip('train-roleplay', 2, { from: 3 }),
  clip('field-kitchen', 2, { from: 6, gain: 0.06 }),
  clip('win-crowd', 2, { from: 3 }),

  // ── Finale (beats 584–620) ─────────────────────────────────────────────────────────────────────
  // their double high-five
  clip('win-cheer', 8, { from: 3.4, gain: 0.5, hit: true, ov: big([{ text: 'TRAIN.', size: 380 }], { shade: 0.45, exit: false }) }),
  clip('win-pepTalk', 8, { from: 4, gain: 0.4, hit: true, ov: big([{ text: 'ORGANIZE.', size: 340 }], { shade: 0.45, exit: false }) }),
  clip('win-crowd', 8, { from: 1.35, gain: 0.5, hit: true, ov: big([{ text: 'WIN.', size: 420, color: O }], { shade: 0.45, exit: false }) }),
  clip('win-highfive', 4, { from: 5.3 }),
  clip('win-walk', 4, { from: 2.5, gain: 0 }),
  clip('field-farmhouse', 4, { from: 4.0 }), // the handshake

  // ── End card + disclaimer (beats 620–656) ──────────────────────────────────────────────────────
  gfx('endcard', 20, { cta: 'Apply for the next weekend intensive', url: 'organizesd.org' }, { hit: true }),
  gfx('disclaimer', 16, {
    lines: [
      'Organize SD is a Section 527 political organization.',
      'Not authorized by any candidate or candidate’s committee. Contributions are not tax-deductible.',
      'Contains AI-generated imagery.',
    ],
  }),
];
