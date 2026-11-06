// Viewer-feedback revision. Each sequence teaches a named organizing step.
// Rejected sources are absent; chapter boundaries remain locked to the score.
export const SCORE = 'audio/score-2.mp3';
const clip = (id, beats, opts = {}) => ({ type: 'clip', id, beats, gain: 0, ...opts });
const gfx = (scene, beats, params, opts = {}) => ({ type: 'gfx', scene, beats, params, ...opts });
const big = (lines, opts = {}) => ({ scene: 'bigover', params: { lines, ...opts } });
const lower = (kicker, text, opts = {}) => ({ scene: 'lower', params: { kicker, text }, ...opts });
const say = (beats, lines, accent = [], opts = {}) => gfx('statement', beats,
  { lines: lines.map(line => line.split(' ')), accent, wordAt: 0.23, size: 160, ...opts });
const section = (name, beats, items) => {
  const actual = items.reduce((n, s) => n + s.beats, 0);
  if (actual !== beats) throw new Error(`${name}: ${actual} beats, expected ${beats}`);
  return items.map(s => ({ ...s, chapter: name }));
};
const O = '#ff8a3d';

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
    clip('field-diner', 8, { from: 0.25, ov: lower('It starts person to person', 'Neighbors talking to neighbors.') }),
    say(8, ['THEY’RE WON ONE', 'CONVERSATION', 'AT A TIME.'], ['CONVERSATION'], { size: 150 }),
  ]),
  ...section('Train', 160, [
    gfx('slam', 8, { word: 'TRAIN.', num: '01 / 03', kicker: 'Three-day weekend intensive' }, { hit: true }),
    clip('train-arrive', 6, { from: 0.3, gain: 0.2, ov: lower('Friday through Sunday', 'Meet your organizing team.') }),
    clip('r2-trainer', 12, { from: 0, dialog: true, ov: lower('Learn the fundamentals', 'Ask a good question.', { beats: 7 }) }),
    say(8, ['ASK.', 'LISTEN.', 'FOLLOW UP.'], ['LISTEN.'], { size: 190, wordAt: 0.35 }),
    // The response finishes at 5.32s; thirteen beats preserves the full exchange.
    clip('r2-practice', 13, { from: 0, dialog: true, ov: lower('Listening practice', 'Try it with a partner.', { beats: 7 }) }),
    clip('r2-materials', 9, { from: 0, gain: 0.1, ov: lower('Leave with a plan', 'Routes. Scripts. Next steps.', { beats: 5 }) }),
    gfx('snowflake', 24, { captions: ['One organizer.', 'Builds leaders.', 'Who build teams.', 'That reach every door.'] }),
    clip('r2-phone', 12, { from: 0, dialog: true, ov: lower('Recruiting practice', 'Make a specific invitation.', { beats: 7 }) }),
    clip('land-falls', 8, { from: 4.2, gain: 0.3, ov: lower('Take the skills home', 'Start in your community.', { beats: 16 }) }),
    clip('land-mainstreet', 8, { from: 4.2, gain: 0.3, purpose: 'The home community where trainees will organize.' }),
    clip('land-farmstead', 8, { from: 0.3, gain: 0.3, ov: lower('Across South Dakota', 'Rural communities, too.') }),
    clip('field-diner', 8, { from: 0.25, ov: lower('One-on-one recruitment', 'Invite a neighbor to volunteer.') }),
    say(8, ['A PERSONAL INVITATION.', 'A CLEAR NEXT STEP.'], ['INVITATION.', 'STEP.'], { size: 145 }),
    clip('r2-campus', 12, { from: 0, gain: 0.1, ov: lower('From interest to action', 'Invite someone to take a shift.', { beats: 6 }) }),
    clip('train-arrive', 4, { from: 6.15, gain: 0.15, ov: lower('Welcome new volunteers', 'Grow your team.') }),
    say(12, ['COME TO LEARN.', 'LEAVE READY', 'TO ORGANIZE.'], ['ORGANIZE.'], { size: 170 }),
  ]),
  ...section('Organize', 204, [
    gfx('slam', 8, { word: 'ORGANIZE.', num: '02 / 03', kicker: 'Right where you live', size: 400 }, { hit: true }),
    say(8, ['START WITH', 'A PLAN.'], ['PLAN.'], { size: 230 }),
    clip('r2-materials', 12, { from: 0.1, gain: 0.1, ov: lower('Before the shift', 'Know the route and the goal.', { beats: 6 }) }),
    clip('field-kitchen', 12, { from: 0.2, ov: lower('Prepare together', 'Agree on roles and routes.') }),
    clip('r2-campus', 12, { from: 0.1, gain: 0.1, ov: lower('Recruit volunteers', 'Give new people a way to help.', { beats: 6 }) }),
    clip('r2-phone', 8, { from: 0.3, ov: lower('Make the invitation', 'Ask for a specific next step.') }),
    clip('land-porchlights', 8, { from: 3.6, gain: 0.3, ov: lower('Then reach your neighbors', 'One doorstep at a time.') }),
    say(8, ['A QUESTION.', 'TIME TO LISTEN.'], ['LISTEN.'], { size: 210 }),
    // Breakdown at beat 300. The organizer asks; the father answers at his door.
    clip('r2-doorstep', 20, { from: 0, dialog: true, ov: lower('At the door', 'Ask what matters.', { beats: 6 }) }),
    say(8, ['START WITH WHAT', 'PEOPLE TELL YOU.'], ['PEOPLE'], { size: 190 }),
    // Resident's complete answer ends at 7.38s; seventeen beats includes it.
    clip('r2-resident-close', 17, { from: 0, dialog: true, ov: lower('Make room for an answer', 'Every neighbor deserves a voice.', { beats: 6 }) }),
    clip('field-elder', 7, { from: 3.4, ov: lower('Listen locally', 'Learn from your neighbors.') }),
    say(8, ['LISTEN.', 'CONNECT.', 'FOLLOW UP.'], ['CONNECT.'], { size: 190, wordAt: 0.35 }),
    clip('r2-materials', 8, { from: 2.1, gain: 0.1, ov: lower('After each conversation', 'Keep track of the next step.') }),
    clip('field-kitchen', 8, { from: 3.2, ov: lower('Debrief as a team', 'Share what you learned.') }),
    gfx('map', 16, { kicker: 'From Sioux Falls to the Black Hills', text: 'Every county. Every door.' }),
    clip('r2-campus', 8, { from: 2.1, gain: 0.1, ov: lower('Build the team', 'Turn interest into involvement.') }),
    clip('r2-phone', 8, { from: 2.1, ov: lower('Follow through', 'Keep the conversation going.') }),
    clip('field-diner', 4, { from: 0.5, ov: lower('One person at a time', 'Invite a neighbor.') }),
    clip('land-storm', 8, { from: 0.3, gain: 0.4, ov: lower('Keep showing up', 'Between election days.') }),
    say(8, ['BUILD THE HABIT.', 'BUILD THE TEAM.'], ['TEAM.'], { size: 185 }),
  ]),
  ...section('Build for the future', 28, [
    clip('land-windmill', 8, { from: 0.3, gain: 0.4, ov: big([{ text: 'BUILDING FOR', size: 120 }, { text: '2028', size: 330, color: O }, { text: 'AND BEYOND.', size: 120 }]) }),
    clip('land-mainstreet', 8, { from: 4.2, gain: 0.3, ov: lower('Lasting power', 'Starts where you live.') }),
    say(12, ['OUR GOAL:', 'LOCAL TEAMS.', 'LASTING CAPACITY.'], ['TEAMS.', 'CAPACITY.'], { size: 175 }),
  ]),
  ...section('Win', 116, [
    gfx('slam', 8, { word: 'WIN.', num: '03 / 03', kicker: '2028 and beyond', size: 560 }, { hit: true }),
    say(8, ['BY 2028:'], ['2028:'], { size: 320 }),
    clip('r2-trainer', 12, { from: 0.1, ov: lower('The goal', 'More trained organizers.') }),
    clip('field-kitchen', 8, { from: 2.1, ov: lower('The goal', 'Stronger volunteer teams.') }),
    clip('r2-doorstep', 12, { from: 3.8, ov: lower('The goal', 'Better voter conversations.') }),
    clip('r2-campus', 8, { from: 1.6, gain: 0.1, ov: lower('The goal', 'More people taking action.') }),
    gfx('map', 8, { kicker: 'Built county by county', text: 'Ready for 2028.' }),
    // Bridge at beat 520: an invitation to start now.
    clip('land-falls', 8, { from: 0.3, gain: 0.3, ov: lower('The work starts now', 'In your community.') }),
    clip('land-harvest', 8, { from: 0.3, gain: 0.3, ov: big([{ text: 'IT STARTS WITH', size: 120 }, { text: 'ONE WEEKEND.', size: 230, color: O }]) }),
    clip('r2-practice', 8, { from: 2.2, ov: lower('Learn by doing', 'Practice the conversation.') }),
    clip('r2-materials', 8, { from: 1.7, gain: 0.1, ov: lower('Leave ready', 'Put your plan into action.') }),
    clip('land-porchlights', 8, { from: 3.6, gain: 0.3, ov: big([{ text: 'AND ONE', size: 120 }, { text: 'CONVERSATION', size: 220, color: O }, { text: 'AT A TIME.', size: 120 }]) }),
    clip('field-diner', 4, { from: 1.2, ov: lower('Start with someone you know', 'Make the invitation.') }),
    clip('land-prairie', 8, { from: 3.6, gain: 0.3, ov: big([{ text: 'A STRONGER', size: 150 }, { text: 'SOUTH DAKOTA.', size: 230, color: O }]) }),
  ]),
  ...section('Skills recap', 12, [
    clip('r2-trainer', 2, { from: 1.5, ov: lower('Your next step', 'Join the weekend intensive.', { beats: 12 }) }),
    clip('r2-materials', 2, { from: 1.5, purpose: 'Recap: preparation.' }),
    clip('r2-phone', 2, { from: 3.8, purpose: 'Recap: recruitment.' }),
    clip('r2-campus', 2, { from: 4.1, purpose: 'Recap: volunteering.' }),
    clip('r2-doorstep', 2, { from: 4, purpose: 'Recap: listening.' }),
    clip('field-kitchen', 2, { from: 5, purpose: 'Recap: teamwork.' }),
  ]),
  ...section('Finale', 36, [
    clip('r2-trainer', 8, { from: 0.3, hit: true, ov: big([{ text: 'TRAIN.', size: 380 }], { shade: 0.45, exit: false }) }),
    clip('r2-campus', 8, { from: 0.3, hit: true, ov: big([{ text: 'ORGANIZE.', size: 340 }], { shade: 0.45, exit: false }) }),
    clip('land-mainstreet', 8, { from: 0.5, gain: 0.3, hit: true, ov: big([{ text: 'WIN.', size: 420, color: O }], { shade: 0.45, exit: false }) }),
    clip('r2-materials', 4, { from: 2, ov: lower('Learn the skills', 'Put them to work.', { beats: 12 }) }),
    clip('r2-doorstep', 4, { from: 7.8, purpose: 'Callback: listening to a parent at his door.' }),
    clip('r2-phone', 4, { from: 4, purpose: 'Callback: inviting the next volunteer.' }),
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
