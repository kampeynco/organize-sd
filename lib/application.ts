import { validateVoiceAnswer, type VoiceAnswer } from './voiceAnswer.js';
/* ─── Types ─── */
export type QuestionType = 'text' | 'textarea' | 'yesno' | 'scale' | 'multichoice' | 'voice';

export interface Question {
  id: string;
  question: string;
  subtitle?: string;
  maxWords?: number;
  answerGuidance?: string;
  type: QuestionType;
  inputType?: 'text' | 'email';
  autoComplete?: string;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  required?: boolean;
  /** If the user answered a specific value on a previous question, skip to a different question */
  branchOn?: { answerId: string; value: string; gotoId: string };
}

/* ─── Question Data ─── */
export const QUESTIONS: Question[] = [
  { id: 'name', question: 'What is your full name?', type: 'text', autoComplete: 'name', required: true },
  { id: 'email', question: 'What is your email address?', subtitle: "We'll use this to follow up on your application.", type: 'text', inputType: 'email', autoComplete: 'email', required: true },
  {
    id: 'why_join',
    maxWords: 150,
    answerGuidance: 'Aim for 75–125 words. Share what motivates you to apply and what you hope to learn.',
    question: 'Why do you want to join Organize SD?',
    type: 'textarea',
    required: true,
  },
  {
    id: 'weekend_availability',
    question: 'Can you attend multi-day training sessions on weekends (weekend intensives)?',
    type: 'yesno',
    required: true,
  },
  {
    id: 'future_training',
    question: 'Are you interested in future training opportunities?',
    subtitle: 'Since you\'re unable to attend weekend intensives right now, we\'d love to keep you in the loop.',
    type: 'yesno',
    required: true,
  },
  {
    id: 'travel',
    question: 'Are you able to travel to the training location if required?',
    type: 'yesno',
    required: true,
  },
  {
    id: 'comfort_strangers',
    question: 'What\'s your comfort level having conversations with strangers?',
    subtitle: '1 = very uncomfortable, 10 = totally at ease',
    type: 'scale',
    scaleMin: 1,
    scaleMax: 10,
    required: true,
  },
  {
    id: 'important_issue',
    maxWords: 250,
    answerGuidance: 'Aim for 100–200 words. Name one issue, explain why it matters to you, and describe the change you want to see.',
    question: 'What issue is most important to you and why?',
    type: 'textarea',
    required: true,
  },
  {
    id: 'proudest_action',
    maxWords: 250,
    answerGuidance: 'Aim for 100–200 words. Describe one action, your role, and its impact or what you learned.',
    question: 'What is the political action you are most proud of?',
    type: 'textarea',
    required: true,
  },
  {
    id: 'leadership',
    maxWords: 150,
    answerGuidance: 'Aim for 50–100 words. A short list is fine: include each role and your main responsibility. Informal leadership counts; if you are new to it, say so.',
    question: 'What leadership positions have you held?',
    type: 'textarea',
    required: true,
  },
  {
    id: 'elevator_pitch',
    question: 'Give a 30-second pitch for why someone should vote in November 2028.',
    subtitle: 'Record your answer as if you’re speaking to an undecided voter.',
    type: 'voice',
    required: true,
  },
  {
    id: 'organizing_experience',
    maxWords: 250,
    answerGuidance: 'Aim for 100–200 words. Describe one relevant experience, what you did, and the outcome. If you are new to organizing, share a related experience or skill.',
    question: 'What is the most relevant organizing experience you\'ve had?',
    subtitle: 'Work, volunteer, community, campus, union, faith, etc.',
    type: 'textarea',
    required: true,
  },
  {
    id: 'start_from_zero',
    maxWords: 250,
    answerGuidance: 'Aim for 100–200 words. Explain what you built, how you got started, and one challenge or lesson. If you have not done this yet, a brief answer is fine.',
    question: 'Have you ever had to "start from zero" to build a group or program?',
    subtitle: 'Political or non-political — tell us about it.',
    type: 'textarea',
    required: true,
  },
  {
    id: 'rural_experience',
    maxWords: 150,
    answerGuidance: 'Aim for 50–100 words. Describe the community, your connection to it, and what you learned. This question is optional; skip it if you have no relevant experience.',
    question: 'What\'s your experience working with rural communities or small towns (if any)?',
    type: 'textarea',
    required: false,
  },
  {
    id: 'juggling',
    maxWords: 250,
    answerGuidance: 'Aim for 100–200 words. Give one example of competing responsibilities, how you managed them, and the result.',
    question: 'Tell us about a time you had to juggle work/school/family responsibilities while meeting commitments.',
    type: 'textarea',
    required: true,
  },
  {
    id: 'phone_internet',
    question: 'Do you have consistent access to a phone and internet?',
    subtitle: 'For those needing assistance with resources.',
    type: 'yesno',
    required: true,
  },
  {
    id: 'learning_style',
    question: 'What learning environment helps you most?',
    type: 'multichoice',
    options: ['Lecture', 'Hands-on practice', 'Reading', 'Roleplay', 'Mentoring'],
    required: true,
  },
  {
    id: 'organizing_role',
    question: 'What kind of organizing role are you aiming for after the program?',
    type: 'multichoice',
    options: ['Paid organizer', 'Volunteer leader', 'Staff role', 'Campaign support', 'Community org'],
    required: true,
  },
  {
    id: 'diverse_teams',
    maxWords: 250,
    answerGuidance: 'Aim for 100–200 words. Share one team experience, how you worked across differences, and what you learned.',
    question: 'What is your experience working on teams with people from different backgrounds and identities?',
    type: 'textarea',
    required: true,
  },
];


export const MAX_ANSWER_LENGTH = 10000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function visibleQuestions(answers: Record<string, string>): Question[] {
  return QUESTIONS.filter(q => q.id !== 'future_training' || answers.weekend_availability === 'No');
}

export function countWords(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

export function answerError(question: Question, value: string): string | null {
  const answer = value.trim();
  if (!answer) return question.required ? 'Please enter an answer.' : null;
  const max = question.id === 'name' ? 200 : question.id === 'email' ? 254 : MAX_ANSWER_LENGTH;
  if (question.maxWords && countWords(answer) > question.maxWords) return `Please use ${question.maxWords} words or fewer.`;
  if (answer.length > max) return `Please use ${max} characters or fewer.`;
  if (question.id === 'email' && !EMAIL_RE.test(answer)) return 'Please enter a valid email address.';
  if (question.type === 'yesno' && !['Yes', 'No'].includes(answer)) return 'Please select Yes or No.';
  if (question.type === 'multichoice' && !question.options?.includes(answer)) return 'Please select one of the available options.';
  if (question.type === 'scale' && (!/^\d+$/.test(answer) || Number(answer) < question.scaleMin! || Number(answer) > question.scaleMax!)) return 'Please select a number from 1 to 10.';
  return null;
}

export function validateApplication(value: unknown, voiceValue?: unknown):
  | { answers: Record<string, string>; voiceAnswer: VoiceAnswer; error?: never; field?: never }
  | { error: string; field?: string; answers?: never; voiceAnswer?: never } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'Invalid application.' };
  const raw = value as Record<string, unknown>;
  const answers: Record<string, string> = {};
  // Validate branch selection before deciding whether future_training is required.
  const questions = visibleQuestions({ weekend_availability: typeof raw.weekend_availability === 'string' ? raw.weekend_availability.trim() : '' });
  for (const question of questions) {
    if (question.type === 'voice') continue;
    const value = raw[question.id];
    if (value !== undefined && typeof value !== 'string') return { error: 'Please enter a valid answer.', field: question.id };
    const answer = typeof value === 'string' ? value.trim() : '';
    const error = answerError(question, answer);
    if (error) return { error, field: question.id };
    answers[question.id] = question.id === 'email' ? answer.toLowerCase() : answer;
  }
  const voice = validateVoiceAnswer(voiceValue);
  if (voice.error) return { error: voice.error, field: 'elevator_pitch' };
  return { answers, voiceAnswer: voice.voice };
}
