// Third revision, from the viewer's frame-by-frame notes. Against timeline-v2:
// - the diner is the waitress-free r3-diner; the sign-up table is r3-campus-print (sheet facing the
//   signer, the logo printed on the tablecloth);
// - the poster, map, field guide, cards, folder and banner carry the real logo (r3-*, brand.py);
// - the resident's answer is a native shot (r3-resident) instead of an upscaled crop;
// - the kitchen is reframed above the frying pan the model left on the table;
// - captions describe what is on screen; the Win chapter pays off on an election-night watch party.
// Chapter boundaries remain locked to the score.
export const SCORE = 'audio/score-2.mp3';
const clip = (id, beats, opts = {}) => ({ type: 'clip', id, beats, gain: 0, ...opts });
const gfx = (scene, beats, params, opts = {}) => ({ type: 'gfx', scene, beats, params, ...opts });
const big = (lines, opts = {}) => ({ scene: 'bigover', params: { lines, ...opts } });
const lower = (kicker, text, { size, ...opts } = {}) => ({ scene: 'lower', params: { kicker, text, ...(size && { size }) }, ...opts });
const say = (beats, lines, accent = [], opts = {}) => gfx('statement', beats,
  { lines: lines.map(line => line.split(' ')), accent, wordAt: 0.23, size: 160, ...opts });
const section = (name, beats, items) => {
  const actual = items.reduce((n, s) => n + s.beats, 0);
  if (actual !== beats) throw new Error(`${name}: ${actual} beats, expected ${beats}`);
  return items.map(s => ({ ...s, chapter: name }));
};
const O = '#ff8a3d';
// The table at the kitchen debrief holds a frying pan with a slab in it; frame above it.
const kitchen = (beats, opts) => clip('field-kitchen', beats, { frame: [245, 0, 1431, 805], ...opts });

export const TIMELINE = [
  ...section('South Dakota', 40, [
    clip('land-prairie', 8, { from: 0, gain: 0.5, ov: big([{ text: 'SOUTH DAKOTA.', size: 230 }], { shade: 0.3 }), fadeIn: 0.6 }),
    clip('land-badlands', 8, { from: 0.4, gain: 0.4, ov: big([{ text: '77,116', size: 300, color: O }, { text: 'SQUARE MILES', size: 110 }]) }),
    clip('land-blackhills', 8, { from: 0.4, gain: 0.4, ov: big([{ text: '66', size: 330, color: O }, { text: 'COUNTIES', size: 110 }]) }),
    clip('land-mainstreet', 8, { from: 0.4, gain: 0.4, ov: big([{ text: 'HUNDREDS OF', size: 120 }, { text: 'SMALL TOWNS', size: 200, color: O }]) }),
    clip('land-porchlights', 8, { from: 0.2, gain: 0.5, ov: big([{ text: 'AND A WHOLE LOT OF', size: 110 }, { text: 'FRONT DOORS.', size: 230, color: O }]) }),
  ]),
  ...section('Why organize', 24, [
    say(8, ['ELECTIONS AREN’T WON', 'ON TV.'], ['TV.']),
    clip('r3-diner', 8, { from: 0.2, ov: lower('It starts person to person', 'Neighbors talking to neighbors.') }),
    say(8, ['THEY’RE WON ONE', 'CONVERSATION', 'AT A TIME.'], ['CONVERSATION'], { size: 150 }),
  ]),
  ...section('Train', 160, [
    gfx('slam', 8, { word: 'TRAIN.', num: '01 / 03', kicker: 'Three-day weekend intensive' }, { hit: true }),
    clip('train-arrive', 6, { from: 0.3, gain: 0.2, ov: lower('Friday through Sunday', 'Meet your organizing team.') }),
    clip('r3-trainer', 12, { from: 0, dialog: true, ov: lower('Learn the fundamentals', 'Ask a good question.', { beats: 7 }) }),
    say(8, ['ASK.', 'LISTEN.', 'FOLLOW UP.'], ['LISTEN.'], { size: 190, wordAt: 0.35 }),
    // The response finishes at 5.32s; thirteen beats preserves the full exchange.
    clip('r3-practice', 13, { from: 0, dialog: true, ov: lower('Listening practice', 'Try it with a partner.', { beats: 7 }) }),
    clip('r3-materials', 9, { from: 0, gain: 0.1, ov: lower('Leave with a plan', 'Routes. Scripts. Next steps.', { beats: 5 }) }),
    gfx('snowflake', 24, { captions: ['One organizer.', 'Builds leaders.', 'Who build teams.', 'That reach every door.'] }),
    clip('r3-phone', 12, { from: 0, dialog: true, ov: lower('Recruiting practice', 'Make a specific invitation.', { beats: 7 }) }),
    // The Big Sioux falls, a small-town main street, a farm: where trainees take the skills.
    clip('land-falls', 8, { from: 4.2, gain: 0.3, ov: lower('Take the skills home', 'From Sioux Falls…') }),
    clip('land-mainstreet', 8, { from: 4.2, gain: 0.3, ov: lower('Take the skills home', '…to every Main Street.') }),
    clip('land-farmstead', 8, { from: 0.3, gain: 0.3, ov: lower('Across South Dakota', 'Rural communities, too.') }),
    clip('r3-diner', 8, { from: 1.2, ov: lower('One-on-one recruitment', 'Invite a neighbor to volunteer.') }),
    say(8, ['A PERSONAL INVITATION.', 'A CLEAR NEXT STEP.'], ['INVITATION.', 'STEP.'], { size: 145 }),
    clip('r3-campus-print', 12, { from: 0, gain: 0.1, ov: lower('From interest to action', 'Sign up for a shift.', { beats: 6 }) }),
    clip('train-arrive', 4, { from: 6.15, gain: 0.15, ov: lower('Welcome new volunteers', 'Grow your team.') }),
    say(12, ['COME TO LEARN.', 'LEAVE READY', 'TO ORGANIZE.'], ['ORGANIZE.'], { size: 170 }),
  ]),
  ...section('Organize', 204, [
    gfx('slam', 8, { word: 'ORGANIZE.', num: '02 / 03', kicker: 'Right where you live', size: 400 }, { hit: true }),
    say(8, ['START WITH', 'A PLAN.'], ['PLAN.'], { size: 230 }),
    clip('r3-materials', 12, { from: 0.1, gain: 0.1, ov: lower('Before the shift', 'Know the route and the goal.', { beats: 6 }) }),
    kitchen(12, { from: 0.2, ov: lower('Prepare together', 'Plan the week as a team.') }),
    clip('r3-campus-print', 12, { from: 0.1, gain: 0.1, ov: lower('Recruit volunteers', 'Sign new people up.', { beats: 6 }) }),
    clip('r3-phone', 8, { from: 0.3, ov: lower('Make the invitation', 'Ask for a specific next step.') }),
    clip('land-porchlights', 8, { from: 3.6, gain: 0.3, ov: lower('Then reach your neighbors', 'One doorstep at a time.') }),
    say(8, ['A QUESTION.', 'TIME TO LISTEN.'], ['LISTEN.'], { size: 210 }),
    // Breakdown at beat 300. The organizer asks; the father answers at his door.
    clip('r2-doorstep', 20, { from: 0, dialog: true, ov: lower('At the door', 'Ask what matters.', { beats: 6 }) }),
    say(8, ['START WITH WHAT', 'PEOPLE TELL YOU.'], ['PEOPLE'], { size: 190 }),
    // The resident's whole answer fits in seventeen beats (checked in revision/audit.mjs).
    clip('r3-resident', 17, { from: 0.35, dialog: true, ov: lower('Make room for an answer', 'Every neighbor deserves a voice.', { beats: 6 }) }),
    clip('field-elder', 7, { from: 3.4, ov: lower('Listen locally', 'Learn from your neighbors.') }),
    say(8, ['LISTEN.', 'CONNECT.', 'FOLLOW UP.'], ['CONNECT.'], { size: 190, wordAt: 0.35 }),
    clip('r3-materials', 8, { from: 2.1, gain: 0.1, ov: lower('After each conversation', 'Plan the next visit.') }),
    kitchen(8, { from: 3.2, ov: lower('Debrief as a team', 'Share what you learned.') }),
    gfx('map', 16, { kicker: 'From Sioux Falls to the Black Hills', text: 'Every county. Every door.' }),
    clip('r3-campus-print', 8, { from: 2.1, gain: 0.1, ov: lower('Build the team', 'Every name counts.') }),
    clip('r3-phone', 8, { from: 2.1, ov: lower('Follow through', 'Keep the conversation going.') }),
    clip('r3-diner', 4, { from: 2.8, ov: lower('One person at a time', 'Invite a neighbor.') }),
    clip('land-storm', 8, { from: 0.3, gain: 0.4, ov: lower('Keep showing up', 'Rain or shine.') }),
    say(8, ['BUILD THE HABIT.', 'BUILD THE TEAM.'], ['TEAM.'], { size: 185 }),
  ]),
  ...section('Build for the future', 28, [
    clip('land-windmill', 8, { from: 0.3, gain: 0.4, ov: big([{ text: 'BUILDING FOR', size: 120 }, { text: '2028', size: 330, color: O }, { text: 'AND BEYOND.', size: 120 }]) }),
    clip('land-mainstreet', 8, { from: 4.2, gain: 0.3, ov: lower('Lasting power', 'Built town by town.') }),
    say(12, ['OUR GOAL:', 'LOCAL TEAMS.', 'LASTING CAPACITY.'], ['TEAMS.', 'CAPACITY.'], { size: 175 }),
  ]),
  ...section('Win', 116, [
    gfx('slam', 8, { word: 'WIN.', num: '03 / 03', kicker: '2028 and beyond', size: 560 }, { hit: true }),
    say(8, ['BY 2028:'], ['2028:'], { size: 320 }),
    clip('r3-trainer', 12, { from: 0.1, ov: lower('The goal', 'More trained organizers.') }),
    kitchen(8, { from: 2.1, ov: lower('The goal', 'Stronger volunteer teams.') }),
    clip('r2-doorstep', 12, { from: 3.8, ov: lower('The goal', 'Better voter conversations.') }),
    clip('r3-campus-print', 8, { from: 1.6, gain: 0.1, ov: lower('The goal', 'More people signing up.') }),
    gfx('map', 12, { kicker: 'Built county by county', text: 'Ready for 2028.' }),
    // Election night: the room waits on the returns, then erupts (source 4.4s) just as the second
    // caption lands. r4-watchparty is usable to 6.8s; after that hands meet overhead.
    clip('r4-watchparty', 12, { from: 1.35, gain: 0.5, mute: [[1.8, 4.15]], ov: [  // garbled murmurs before the cheer
      lower('Election night', 'Watch the returns together.', { beats: 6 }),
      lower('The goal', 'Win together.', { at: 6, beats: 6 }),
    ] }),
    clip('land-harvest', 8, { from: 0.3, gain: 0.3, ov: big([{ text: 'IT STARTS WITH', size: 120 }, { text: 'ONE WEEKEND.', size: 230, color: O }]) }),
    clip('r3-materials', 8, { from: 1.7, gain: 0.1, ov: lower('Leave ready', 'Put your plan into action.') }),
    clip('land-porchlights', 8, { from: 3.6, gain: 0.3, ov: big([{ text: 'AND ONE', size: 120 }, { text: 'CONVERSATION', size: 220, color: O }, { text: 'AT A TIME.', size: 120 }]) }),
    clip('r3-diner', 4, { from: 0.4, ov: lower('Start with someone you know', 'Make the invitation.') }),
    clip('land-prairie', 8, { from: 3.6, gain: 0.3, ov: big([{ text: 'A STRONGER', size: 150 }, { text: 'SOUTH DAKOTA.', size: 230, color: O }]) }),
  ]),
  ...section('Skills recap', 12, [
    clip('r3-trainer', 2, { from: 1.5, ov: lower('Your next step', 'Join the weekend intensive.', { beats: 12, size: 92 }) }),  // smaller: it runs over the tablecloth print
    clip('r3-materials', 2, { from: 1.5, purpose: 'Recap: preparation.' }),
    clip('r3-phone', 2, { from: 3.8, purpose: 'Recap: recruitment.' }),
    clip('r3-campus-print', 2, { from: 4.1, purpose: 'Recap: volunteering.' }),
    clip('r2-doorstep', 2, { from: 4, purpose: 'Recap: listening.' }),
    kitchen(2, { from: 5, purpose: 'Recap: teamwork.' }),
  ]),
  ...section('Finale', 36, [
    clip('r3-trainer', 8, { from: 0.3, hit: true, ov: big([{ text: 'TRAIN.', size: 380 }], { shade: 0.45, exit: false }) }),
    clip('r3-campus-print', 8, { from: 0.3, hit: true, ov: big([{ text: 'ORGANIZE.', size: 340 }], { shade: 0.45, exit: false }) }),
    clip('r4-watchparty', 6, { from: 4.05, gain: 0.4, hit: true, ov: big([{ text: 'WIN.', size: 420, color: O }], { shade: 0.45, exit: false }) }),
    clip('r3-materials', 6, { from: 2, ov: lower('Learn the skills', 'Put them to work.', { beats: 14 }) }),
    clip('r2-doorstep', 4, { from: 7.8, purpose: 'Callback: listening to a parent at his door.' }),
    clip('r3-phone', 4, { from: 4, purpose: 'Callback: inviting the next volunteer.' }),
  ]),
  ...section('Apply', 36, [
    gfx('endcard', 20, { cta: 'Apply for the next weekend intensive', url: 'organizesd.org' }, { hit: true }),
    gfx('disclaimer', 16, { lines: [
      'Organize SD is a Section 527 political organization.',
      'Not authorized by any candidate or candidate’s committee. Contributions are not tax-deductible.',
      'Contains AI-generated imagery.',
    ] }),
  ]),
];
