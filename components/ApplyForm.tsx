
import React, { useState, useEffect, useRef } from 'react';
import { VoiceAnswerRecorder } from './VoiceAnswerRecorder';
import { type VoiceAnswer } from '../lib/voiceAnswer';
import { Logo } from './Logo';
import { Icon } from './Icon';
import { faArrowLeft, faArrowUp, faCheck, faCircleInfo, faPaperPlane, faXmark } from '@fortawesome/free-solid-svg-icons';

import { MAX_ANSWER_LENGTH, answerError, countWords, validateApplication, visibleQuestions as getVisibleQuestions } from '../lib/application';
import { submitApplication } from '../lib/submitApplication';

interface ApplyFormProps {
  onBack: () => void;
}

/* ─── Component ─── */
export const ApplyForm: React.FC<ApplyFormProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [voiceAnswer, setVoiceAnswer] = useState<VoiceAnswer | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isAnimating, setIsAnimating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const submittingRef = useRef(false);
  const submissionIdRef = useRef<string | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  const visibleQuestions = getVisibleQuestions(answers);
  const current = visibleQuestions[currentStep];
  const totalSteps = visibleQuestions.length;
  const progress = totalSteps > 0 ? ((currentStep) / totalSteps) * 100 : 0;

  /* Focus the input when the step changes */
  useEffect(() => {
    if (isSubmitted || isSubmitting) return;
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
    if (isAnimating || submittingRef.current) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setSubmitError('');
    setDirection(dir);
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(step);
      setIsAnimating(false);
    }, 300);
  };

  const goNext = () => {
    if (isAnimating || submittingRef.current) return;
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
    if (!current || submittingRef.current) return;
    submissionIdRef.current = null;
    setSubmitError('');
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  };

  const currentAnswer = current ? answers[current.id] || '' : '';

  const currentWordCount = countWords(currentAnswer);
  const overWordLimit = !!current?.maxWords && currentWordCount > current.maxWords;

  const canProceed = () => {
    if (!current) return false;
    if (current.type === 'voice') return !voiceBusy && !!voiceAnswer;
    return !answerError(current, currentAnswer);
  };

  /* For yes/no & scale, auto-advance after selection */
  const selectAndAdvance = (value: string) => {
    if (!current || isAnimating || submittingRef.current) return;
    setAnswer(value);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => goNext(), 350);
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    const result = validateApplication(answers, voiceAnswer);
    if (result.error) {
      const step = visibleQuestions.findIndex(q => q.id === result.field);
      if (step >= 0) setCurrentStep(step);
      setSubmitError(result.error);
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      submissionIdRef.current ??= crypto.randomUUID();
      await submitApplication(submissionIdRef.current, result.answers, result.voiceAnswer);
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save your application. Please try again.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  /* ─── Keyboard ─── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitted || isSubmitting) return;
      if (e.key === 'Enter' && !e.shiftKey && current?.type !== 'textarea' && current?.type !== 'voice') {
        e.preventDefault();
        if (canProceed()) goNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, answers, voiceAnswer, voiceBusy, isSubmitted, isSubmitting, isAnimating]);

  /* ─── Render Helpers ─── */
  const slideClass = isAnimating
    ? direction === 'forward'
      ? 'opacity-0 translate-y-8'
      : 'opacity-0 -translate-y-8'
    : 'opacity-100 translate-y-0';

  const renderQuestionInput = () => {
    if (!current) return null;

    switch (current.type) {
      case 'voice':
        return <VoiceAnswerRecorder value={voiceAnswer} onBusyChange={setVoiceBusy} onChange={voice => {
          submissionIdRef.current = null;
          setSubmitError('');
          setVoiceAnswer(voice);
        }} />;

      case 'text':
        return (
          <input
            ref={inputRef}
            type={current.inputType || 'text'}
            autoComplete={current.autoComplete}
            aria-labelledby="application-question"
            maxLength={current.id === 'name' ? 200 : 254}
            value={currentAnswer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="w-full bg-transparent border-b-3 border-white/30 focus:border-teal-400 text-white text-xl md:text-2xl py-4 outline-none transition-colors placeholder-white/30 caret-teal-400"
          />
        );

      case 'textarea':
        return (
          <div className="w-full">
            <p id="answer-guidance" className="text-white/70 text-sm md:text-base leading-relaxed mb-4">
              <span className="font-bold text-teal-300">Maximum {current.maxWords} words.</span>{' '}
              {current.answerGuidance} Suggested lengths are a guide, not a minimum.
            </p>
            <textarea
              ref={textareaRef}
              aria-labelledby="application-question"
              aria-describedby={`answer-guidance answer-word-count${overWordLimit ? ' answer-word-error' : ''}`}
              aria-invalid={overWordLimit || undefined}
              maxLength={MAX_ANSWER_LENGTH}
              value={currentAnswer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={4}
              className="w-full bg-white/5 border-2 border-white/20 focus:border-teal-400 text-white text-lg md:text-xl p-5 rounded-xl outline-none transition-colors placeholder-white/30 caret-teal-400 resize-none"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs font-medium">
              <p className="text-white/60">
                <Icon icon={faCircleInfo} className="mr-1" /> Press Enter for a new line
              </p>
              <p id="answer-word-count" className={overWordLimit ? 'text-rose-200 font-bold' : 'text-white/70'}>
                {currentWordCount} / {current.maxWords} words
              </p>
            </div>
            {overWordLimit && (
              <p id="answer-word-error" className="text-rose-200 text-sm mt-3" role="alert">
                Please remove {currentWordCount - current.maxWords!} {currentWordCount - current.maxWords! === 1 ? 'word' : 'words'} to continue. Your answer has been kept so you can edit it.
              </p>
            )}
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
                  <span><Icon icon={faCheck} className="mr-2" />{opt}</span>
                ) : (
                  <span><Icon icon={faXmark} className="mr-2" />{opt}</span>
                )}
              </button>
            ))}
          </div>
        );

      case 'scale':
        return (
          <div className="w-full max-w-2xl mx-auto">
            {/* One row of ten; phones get two even rows of five so the buttons stay big enough to tap */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3">
              {Array.from({ length: (current.scaleMax || 10) - (current.scaleMin || 1) + 1 }, (_, i) => {
                const val = (current.scaleMin || 1) + i;
                const strVal = String(val);
                const isSelected = currentAnswer === strVal;
                return (
                  <button
                    key={val}
                    onClick={() => selectAndAdvance(strVal)}
                    className={`w-full aspect-square rounded-xl text-lg md:text-xl font-black transition-all duration-200 border-2 ${
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
            <Icon icon={faCheck} className="text-[#311b92] text-4xl" />
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
            <Icon icon={faArrowLeft} className="mr-3" />Back to Home
          </button>
        </div>
      </div>
    );
  }

  /* ─── Main Form UI ─── */
  return (
    <div className="min-h-screen bg-[#311b92] flex flex-col relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
            disabled={isSubmitting}
            aria-label="Close"
            className="text-white/60 hover:text-white font-bold text-sm uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            <Icon icon={faXmark} />
            <span className="hidden sm:inline">Close</span>
          </button>

          <Logo priority sizes="80px" className="h-10 md:h-12" />

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
          <h2 id="application-question" className="text-2xl md:text-4xl font-black text-white leading-tight mb-3 tracking-tight">
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
          <fieldset disabled={isSubmitting} aria-busy={isSubmitting}>
            {renderQuestionInput()}
          </fieldset>
          {currentAnswer && current?.id === 'email' && answerError(current, currentAnswer) && (
            <p className="text-rose-200 mt-4" role="alert">{answerError(current, currentAnswer)}</p>
          )}
          {submitError && <p className="text-rose-200 mt-4" role="alert">{submitError} Your answers are still here; please try again.</p>}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="relative z-10 px-6 md:px-12 py-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={goPrev}
            aria-label="Back"
            disabled={currentStep === 0 || isSubmitting || isAnimating || voiceBusy}
            className={`flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-all py-3 px-5 rounded-lg ${
              currentStep === 0
                ? 'text-white/10 cursor-not-allowed'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon icon={faArrowUp} />
            <span className="hidden sm:inline">Back</span>
          </button>

          {(current?.type === 'textarea' || current?.type === 'text' || current?.type === 'voice') && (
            <button
              onClick={() => canProceed() ? goNext() : undefined}
              disabled={!canProceed() || isSubmitting || isAnimating}
              className={`flex items-center gap-3 font-black uppercase tracking-widest text-sm py-3 px-8 rounded-xl transition-all ${
                canProceed()
                  ? 'bg-teal-400 text-[#311b92] hover:bg-teal-300 hover:scale-105 shadow-lg shadow-teal-400/20'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Submitting…' : currentStep === totalSteps - 1 ? 'Submit' : 'OK'}
              <Icon icon={currentStep === totalSteps - 1 ? faPaperPlane : faCheck} className="text-xs" />
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
