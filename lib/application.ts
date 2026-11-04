/* ─── Types ─── */
export type QuestionType = 'text' | 'textarea' | 'yesno' | 'scale' | 'multichoice';

export interface Question {
  id: string;
  question: string;
  subtitle?: string;
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
    question: 'Why do you want to join Organize SD?',
    type: 'textarea',
    required: true,
  },
  {
    id: 'weekend_availability',
    question: 'What is your availability attending multi-day training sessions (weekend intensives)?',
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
    question: 'What issue is most important to you and why?',
    type: 'textarea',
    required: true,
  },
  {
    id: 'proudest_action',
    question: 'What is the political action you are most proud of?',
    type: 'textarea',
    required: true,
  },
  {
    id: 'leadership',
    question: 'What leadership positions have you held?',
    type: 'textarea',
    required: true,
  },
  {
    id: 'elevator_pitch',
    question: 'Give a 30-second pitch for why someone should vote in November 2028.',
    subtitle: 'Write it out — imagine you\'re speaking to an undecided voter.',
    type: 'textarea',
    required: true,
  },
  {
    id: 'organizing_experience',
    question: 'What is the most relevant organizing experience you\'ve had?',
    subtitle: 'Work, volunteer, community, campus, union, faith, etc.',
    type: 'textarea',
    required: true,
  },
  {
    id: 'start_from_zero',
    question: 'Have you ever had to "start from zero" to build a group or program?',
    subtitle: 'Political or non-political — tell us about it.',
    type: 'textarea',
    required: true,
  },
  {
    id: 'rural_experience',
    question: 'What\'s your experience working with rural communities or small towns (if any)?',
    type: 'textarea',
    required: false,
  },
  {
    id: 'juggling',
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
    id: 'travel_support',
    question: 'Would you need travel or resource support to participate?',
    subtitle: 'Mileage, hotel, childcare stipend, etc.',
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

export function answerError(question: Question, value: string): string | null {
  const answer = value.trim();
  if (!answer) return question.required ? 'Please enter an answer.' : null;
  const max = question.id === 'name' ? 200 : question.id === 'email' ? 254 : MAX_ANSWER_LENGTH;
  if (answer.length > max) return `Please use ${max} characters or fewer.`;
  if (question.id === 'email' && !EMAIL_RE.test(answer)) return 'Please enter a valid email address.';
  if (question.type === 'yesno' && !['Yes', 'No'].includes(answer)) return 'Please select Yes or No.';
  if (question.type === 'multichoice' && !question.options?.includes(answer)) return 'Please select one of the available options.';
  if (question.type === 'scale' && (!/^\d+$/.test(answer) || Number(answer) < question.scaleMin! || Number(answer) > question.scaleMax!)) return 'Please select a number from 1 to 10.';
  return null;
}

export function validateApplication(value: unknown):
  | { answers: Record<string, string>; error?: never; field?: never }
  | { error: string; field?: string; answers?: never } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'Invalid application.' };
  const raw = value as Record<string, unknown>;
  const answers: Record<string, string> = {};
  // Validate branch selection before deciding whether future_training is required.
  const questions = visibleQuestions({ weekend_availability: typeof raw.weekend_availability === 'string' ? raw.weekend_availability.trim() : '' });
  for (const question of questions) {
    const value = raw[question.id];
    if (value !== undefined && typeof value !== 'string') return { error: 'Please enter a valid answer.', field: question.id };
    const answer = typeof value === 'string' ? value.trim() : '';
    const error = answerError(question, answer);
    if (error) return { error, field: question.id };
    answers[question.id] = question.id === 'email' ? answer.toLowerCase() : answer;
  }
  return { answers };
}
