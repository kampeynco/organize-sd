
import React, { useState, useEffect } from 'react';
import { submitSignup } from '../lib/signup';

const DISMISS_KEY = 'osd-optin-dismissed';

const wasDismissed = () => {
  try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
};

export const StickyOptIn: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(wasDismissed);
  const [email, setEmail] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDismissed) {
      setIsVisible(false);
      return;
    }

    // Show after the reader has passed the training section, hide while another signup form is on screen
    const toggleVisibility = () => {
      const training = document.getElementById('training');
      const newsletter = document.getElementById('newsletter');
      const pastTraining = training ? training.getBoundingClientRect().bottom < 0 : window.scrollY > 1200;
      const newsletterInView = newsletter
        ? newsletter.getBoundingClientRect().top < window.innerHeight && newsletter.getBoundingClientRect().bottom > 0
        : false;
      setIsVisible(pastTraining && !newsletterInView);
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    toggleVisibility();
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [isDismissed]);

  const dismiss = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* storage unavailable */ }
    setIsDismissed(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await submitSignup('sticky', email, zipcode);
      dismiss();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`fixed bottom-4 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[min(56rem,calc(100%-2rem))] z-40 transition-all duration-500 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isVisible}
    >
      <div className="relative rounded-2xl bg-brand-ink/95 backdrop-blur-md text-white shadow-2xl shadow-brand-ink/40 ring-1 ring-white/10 p-3 pl-5 md:pl-6">
        {/* Mobile: one tap to the full form */}
        <div className="flex md:hidden items-center justify-between gap-3">
          <p className="font-semibold text-sm">Get cohort updates</p>
          <div className="flex items-center gap-1">
            <a href="#newsletter" tabIndex={isVisible ? 0 : -1} className="rounded-xl bg-signal px-4 py-2.5 text-sm font-bold text-brand-ink">Sign up</a>
            <button onClick={dismiss} tabIndex={isVisible ? 0 : -1} aria-label="Dismiss signup bar" className="w-10 h-10 grid place-items-center text-white/60 hover:text-white">
              <i className="fas fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        {/* Desktop: inline form */}
        <form onSubmit={handleSubmit} className="hidden md:flex items-center gap-3">
          <p className="font-display font-black uppercase text-xl whitespace-nowrap mr-2">Join the team</p>
          <label htmlFor="sticky-email" className="sr-only">Email</label>
          <input
            id="sticky-email"
            required
            type="email"
            autoComplete="email"
            placeholder="Email address"
            value={email}
            tabIndex={isVisible ? 0 : -1}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 min-w-0 rounded-xl bg-white/10 px-4 py-2.5 text-sm placeholder:text-white/50 ring-1 ring-inset ring-white/15 focus:ring-2 focus:ring-signal focus:outline-none"
          />
          <label htmlFor="sticky-zip" className="sr-only">ZIP code</label>
          <input
            id="sticky-zip"
            required
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            pattern="[0-9]{5}"
            maxLength={5}
            placeholder="ZIP"
            value={zipcode}
            tabIndex={isVisible ? 0 : -1}
            onChange={(e) => setZipcode(e.target.value.replace(/\D/g, ''))}
            className="w-24 rounded-xl bg-white/10 px-4 py-2.5 text-sm placeholder:text-white/50 ring-1 ring-inset ring-white/15 focus:ring-2 focus:ring-signal focus:outline-none"
          />
          <button type="submit" disabled={sending} tabIndex={isVisible ? 0 : -1} className="rounded-xl bg-signal px-5 py-2.5 text-sm font-bold text-brand-ink hover:bg-signal-light transition-colors whitespace-nowrap disabled:opacity-60 disabled:cursor-wait">
            {sending ? 'Saving…' : "I'm in"}
          </button>
          <button type="button" onClick={dismiss} tabIndex={isVisible ? 0 : -1} aria-label="Dismiss signup bar" className="w-10 h-10 grid place-items-center text-white/60 hover:text-white">
            <i className="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </form>
        {error && <p role="alert" className="hidden md:block mt-2 text-sm font-semibold text-signal-light">{error}</p>}
      </div>
    </div>
  );
};
