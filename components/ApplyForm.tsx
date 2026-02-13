
import React, { useState, useEffect, useCallback, useRef } from 'react';

/* ─── Types ─── */
type QuestionType = 'text' | 'textarea' | 'yesno' | 'scale' | 'multichoice';

interface Question {
  id: string;
  question: string;
  subtitle?: string;
  type: QuestionType;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  required?: boolean;
  /** If the user answered a specific value on a previous question, skip to a different question */
  branchOn?: { answerId: string; value: string; gotoId: string };
}

interface ApplyFormProps {
  onBack: () => void;
}

/* ─── Question Data ─── */
const QUESTIONS: Question[] = [
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
    question: 'Give a 30-second pitch for why someone should vote in November 2026.',
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

/* ─── Component ─── */
export const ApplyForm: React.FC<ApplyFormProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isAnimating, setIsAnimating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ─── Build the visible question list based on branching ─── */
  const getVisibleQuestions = useCallback((): Question[] => {
    const visible: Question[] = [];
    for (const q of QUESTIONS) {
      // "future_training" only shows if weekend_availability === 'No'
      if (q.id === 'future_training' && answers['weekend_availability'] !== 'No') {
        continue;
      }
      visible.push(q);
    }
    return visible;
  }, [answers]);

  const visibleQuestions = getVisibleQuestions();
  const current = visibleQuestions[currentStep];
  const totalSteps = visibleQuestions.length;
  const progress = totalSteps > 0 ? ((currentStep) / totalSteps) * 100 : 0;

  /* Focus the input when the step changes */
  useEffect(() => {
    if (isSubmitted) return;
    const timer = setTimeout(() => {
      if (current?.type === 'textarea') {
        textareaRef.current?.focus();
      } else if (current?.type === 'text') {
        inputRef.current?.focus();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [currentStep, isSubmitted, current?.type]);

  /* ─── Navigation ─── */
  const animateTo = (step: number, dir: 'forward' | 'backward') => {
    if (isAnimating) return;
    setDirection(dir);
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(step);
      setIsAnimating(false);
    }, 300);
  };

  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      animateTo(currentStep + 1, 'forward');
    } else {
      handleSubmit();
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      animateTo(currentStep - 1, 'backward');
    }
  };

  const setAnswer = (value: string) => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  };

  const currentAnswer = current ? answers[current.id] || '' : '';

  const canProceed = () => {
    if (!current) return false;
    if (!current.required) return true;
    return currentAnswer.trim().length > 0;
  };

  /* For yes/no & scale, auto-advance after selection */
  const selectAndAdvance = (value: string) => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
    setTimeout(() => goNext(), 350);
  };

  const handleSubmit = () => {
    console.log('Application submitted:', answers);
    setIsSubmitted(true);
  };

  /* ─── Keyboard ─── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitted) return;
      if (e.key === 'Enter' && !e.shiftKey && current?.type !== 'textarea') {
        e.preventDefault();
        if (canProceed()) goNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, answers, isSubmitted]);

  /* ─── Render Helpers ─── */
  const slideClass = isAnimating
    ? direction === 'forward'
      ? 'opacity-0 translate-y-8'
      : 'opacity-0 -translate-y-8'
    : 'opacity-100 translate-y-0';

  const renderQuestionInput = () => {
    if (!current) return null;

    switch (current.type) {
      case 'text':
        return (
          <input
            ref={inputRef}
            type="text"
            value={currentAnswer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="w-full bg-transparent border-b-3 border-white/30 focus:border-teal-400 text-white text-xl md:text-2xl py-4 outline-none transition-colors placeholder-white/30 caret-teal-400"
          />
        );

      case 'textarea':
        return (
          <div className="w-full">
            <textarea
              ref={textareaRef}
              value={currentAnswer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={4}
              className="w-full bg-white/5 border-2 border-white/20 focus:border-teal-400 text-white text-lg md:text-xl p-5 rounded-xl outline-none transition-colors placeholder-white/30 caret-teal-400 resize-none"
            />
            <p className="text-white/40 text-xs mt-2 font-medium">
              <i className="fas fa-info-circle mr-1"></i> Press Shift + Enter for new line
            </p>
          </div>
        );

      case 'yesno':
        return (
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto">
            {['Yes', 'No'].map((opt) => (
              <button
                key={opt}
                onClick={() => selectAndAdvance(opt)}
                className={`flex-1 py-5 px-8 rounded-xl text-xl font-black uppercase tracking-wider transition-all duration-200 border-2 ${
                  currentAnswer === opt
                    ? 'bg-teal-400 border-teal-400 text-[#311b92] scale-105 shadow-lg shadow-teal-400/30'
                    : 'bg-white/5 border-white/20 text-white hover:border-teal-400 hover:bg-white/10 hover:scale-[1.02]'
                }`}
              >
                {opt === 'Yes' ? (
                  <span><i className="fas fa-check mr-2"></i>{opt}</span>
                ) : (
                  <span><i className="fas fa-times mr-2"></i>{opt}</span>
                )}
              </button>
            ))}
          </div>
        );

      case 'scale':
        return (
          <div className="w-full max-w-2xl mx-auto">
            <div className="flex flex-wrap justify-center gap-3">
              {Array.from({ length: (current.scaleMax || 10) - (current.scaleMin || 1) + 1 }, (_, i) => {
                const val = (current.scaleMin || 1) + i;
                const strVal = String(val);
                const isSelected = currentAnswer === strVal;
                return (
                  <button
                    key={val}
                    onClick={() => selectAndAdvance(strVal)}
                    className={`w-14 h-14 md:w-16 md:h-16 rounded-xl text-lg md:text-xl font-black transition-all duration-200 border-2 ${
                      isSelected
                        ? 'bg-teal-400 border-teal-400 text-[#311b92] scale-110 shadow-lg shadow-teal-400/30'
                        : 'bg-white/5 border-white/20 text-white hover:border-teal-400 hover:bg-white/10 hover:scale-105'
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-white/40 text-xs font-bold uppercase tracking-widest mt-4 px-2">
              <span>Very uncomfortable</span>
              <span>Totally at ease</span>
            </div>
          </div>
        );

      case 'multichoice':
        return (
          <div className="w-full max-w-lg mx-auto space-y-3">
            {current.options?.map((opt) => {
              const isSelected = currentAnswer === opt;
              return (
                <button
                  key={opt}
                  onClick={() => selectAndAdvance(opt)}
                  className={`w-full text-left py-4 px-6 rounded-xl text-lg font-bold transition-all duration-200 border-2 flex items-center gap-4 ${
                    isSelected
                      ? 'bg-teal-400 border-teal-400 text-[#311b92] shadow-lg shadow-teal-400/30'
                      : 'bg-white/5 border-white/20 text-white hover:border-teal-400 hover:bg-white/10'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black border-2 flex-shrink-0 ${
                    isSelected ? 'bg-[#311b92] border-[#311b92] text-teal-400' : 'border-white/30 text-white/50'
                  }`}>
                    {String.fromCharCode(65 + (current.options?.indexOf(opt) || 0))}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  /* ─── Submitted Screen ─── */
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#311b92] flex items-center justify-center p-6">
        <div className="text-center text-white max-w-2xl mx-auto space-y-8 animate-fadeIn">
          <div className="w-24 h-24 bg-teal-400 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-teal-400/30">
            <i className="fas fa-check text-[#311b92] text-4xl"></i>
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Application Sent!
          </h1>
          <p className="text-xl md:text-2xl text-white/80 font-medium leading-relaxed">
            Thanks for applying to Organize SD. We'll review your application and be in touch soon.
          </p>
          <button
            onClick={onBack}
            className="bg-teal-400 hover:bg-teal-300 text-[#311b92] font-black text-lg px-10 py-4 rounded-xl uppercase tracking-widest transition-all hover:scale-105 shadow-xl"
          >
            <i className="fas fa-arrow-left mr-3"></i>Back to Home
          </button>
        </div>
      </div>
    );
  }

  /* ─── Main Form UI ─── */
  return (
    <div className="min-h-screen bg-[#311b92] flex flex-col relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-teal-400/8 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-rose-500/8 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-400/5 rounded-full blur-[200px]"></div>
      </div>

      {/* Top bar: progress + navigation */}
      <div className="relative z-10">
        {/* Progress bar */}
        <div className="h-1 bg-white/10">
          <div
            className="h-full bg-teal-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-8 py-4">
          <button
            onClick={onBack}
            className="text-white/60 hover:text-white font-bold text-sm uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            <i className="fas fa-times"></i>
            <span className="hidden sm:inline">Close</span>
          </button>

          <span className="text-white font-black tracking-tighter text-sm md:text-base">
            ORGANIZE SD
          </span>

          <span className="text-white/40 text-sm font-bold tabular-nums">
            {currentStep + 1} / {totalSteps}
          </span>
        </div>
      </div>

      {/* Question area */}
      <div className="flex-grow flex items-center justify-center px-6 md:px-12 py-8 relative z-10">
        <div className={`w-full max-w-3xl mx-auto transition-all duration-300 ease-out ${slideClass}`}>
          {/* Question number */}
          <div className="flex items-center gap-3 mb-6">
            <span className="bg-teal-400/20 text-teal-400 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest">
              Q{currentStep + 1}
            </span>
            {current && !current.required && (
              <span className="text-white/30 text-xs font-bold uppercase tracking-widest">
                Optional
              </span>
            )}
          </div>

          {/* Question text */}
          <h2 className="text-2xl md:text-4xl font-black text-white leading-tight mb-3 tracking-tight">
            {current?.question}
          </h2>

          {/* Subtitle */}
          {current?.subtitle && (
            <p className="text-white/50 text-base md:text-lg font-medium mb-8 leading-relaxed">
              {current.subtitle}
            </p>
          )}
          {!current?.subtitle && <div className="mb-8"></div>}

          {/* Input */}
          {renderQuestionInput()}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="relative z-10 px-6 md:px-12 py-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-all py-3 px-5 rounded-lg ${
              currentStep === 0
                ? 'text-white/10 cursor-not-allowed'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <i className="fas fa-arrow-up"></i>
            <span className="hidden sm:inline">Back</span>
          </button>

          {(current?.type === 'textarea' || current?.type === 'text') && (
            <button
              onClick={() => canProceed() ? goNext() : undefined}
              disabled={!canProceed() && current.required !== false}
              className={`flex items-center gap-3 font-black uppercase tracking-widest text-sm py-3 px-8 rounded-xl transition-all ${
                canProceed() || !current.required
                  ? 'bg-teal-400 text-[#311b92] hover:bg-teal-300 hover:scale-105 shadow-lg shadow-teal-400/20'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {currentStep === totalSteps - 1 ? 'Submit' : 'OK'}
              <i className={`fas ${currentStep === totalSteps - 1 ? 'fa-paper-plane' : 'fa-check'} text-xs`}></i>
            </button>
          )}
        </div>
      </div>

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
      `}</style>
    </div>
  );
};
