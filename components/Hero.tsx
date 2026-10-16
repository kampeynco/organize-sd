
import React, { useState } from 'react';
import { submitSignup } from '../lib/signup';

interface HeroProps {
  onApplyClick: () => void;
}

const PROOF_POINTS = [
  { icon: 'fa-calendar-days', text: '3-day weekend intensive' },
  { icon: 'fa-flag-usa', text: 'Led by Obama-era field organizers' },
  { icon: 'fa-people-group', text: 'Statewide peer network' },
];

/** Circular "campaign button" badge with text running around the edge */
const CampaignBadge: React.FC = () => (
  <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36" aria-hidden="true">
    <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full animate-spinSlow">
      <defs>
        <path id="badge-circle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
      </defs>
      <circle cx="100" cy="100" r="98" fill="#2dd4bf" />
      <text className="font-display" fill="#120a3d" fontSize="21" fontWeight="800" letterSpacing="4.2">
        <textPath href="#badge-circle">TRAIN · ORGANIZE · WIN · SOUTH DAKOTA ·</textPath>
      </text>
    </svg>
    <div className="absolute inset-0 grid place-items-center">
      <span className="font-display font-black text-brand-ink text-3xl sm:text-4xl md:text-5xl leading-none">2028</span>
    </div>
  </div>
);

export const Hero: React.FC<HeroProps> = ({ onApplyClick }) => {
  const [email, setEmail] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [company, setCompany] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await submitSignup('hero', email, zipcode, company);
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="top" className="grain relative isolate overflow-hidden bg-brand text-white">
      {/* Atmosphere: glow + oversized area code watermark */}
      <div className="absolute -z-10 inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[42rem] h-[42rem] rounded-full bg-mint/20 blur-[140px]"></div>
        <div className="absolute bottom-[-12rem] right-[-8rem] w-[36rem] h-[36rem] rounded-full bg-signal/25 blur-[140px]"></div>
        <span className="text-outline absolute right-[-2rem] top-1/2 -translate-y-1/2 font-display font-black text-white/[0.07] text-[22rem] xl:text-[30rem] leading-none select-none hidden md:block">
          605
        </span>
      </div>

      <div className="container mx-auto px-5 pt-32 pb-20 md:pt-40 md:pb-28 grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Message */}
        <div className="lg:col-span-7">
          <p className="animate-rise inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-inset ring-white/20 px-4 py-1.5 text-sm font-semibold text-white/90">
            <span className="w-2 h-2 rounded-full bg-mint" aria-hidden="true"></span>
            Organizer training for South Dakota
          </p>

          <h1 className="mt-6 font-display font-black uppercase leading-[0.82] tracking-tight text-[5.25rem] sm:text-[7.5rem] md:text-[9rem] xl:text-[10.5rem]">
            {/* No entrance animation here: the headline is the largest paint, so it renders immediately */}
            <span className="block">Train.</span>
            <span className="block">Organize.</span>
            <span className="block text-signal">Win.</span>
          </h1>

          <p className="animate-rise [animation-delay:340ms] mt-8 max-w-xl text-lg md:text-xl leading-relaxed text-white/85">
            Organize SD trains South Dakotans to build and run grassroots field programs that recruit volunteers,
            reach voters, and win elections in 2028 and beyond.
          </p>

          <div className="animate-rise [animation-delay:420ms] mt-9 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onApplyClick}
              className="group inline-flex items-center justify-center gap-3 rounded-full bg-signal px-8 py-4 text-lg font-bold text-brand-ink shadow-xl shadow-brand-ink/30 hover:bg-signal-light transition-colors"
            >
              Apply for training
              <i className="fas fa-arrow-right transition-transform group-hover:translate-x-1" aria-hidden="true"></i>
            </button>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-lg font-semibold text-white ring-1 ring-inset ring-white/35 hover:bg-white/10 transition-colors"
            >
              How it works
            </a>
          </div>

          <ul className="animate-rise [animation-delay:500ms] mt-10 flex flex-col sm:flex-row flex-wrap gap-x-7 gap-y-3 text-sm font-medium text-white/75">
            {PROOF_POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-2.5">
                <i className={`fas ${p.icon} text-mint`} aria-hidden="true"></i>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Signup card */}
        <div className="lg:col-span-5 lg:pl-6 animate-rise [animation-delay:560ms]">
          <div className="relative">
            <div className="absolute -top-12 -right-2 sm:-top-14 sm:-right-4 md:-right-8 z-10 rotate-6">
              <CampaignBadge />
            </div>
            <div id="join" className="scroll-mt-28 rounded-3xl bg-white text-brand-ink p-7 md:p-9 shadow-2xl shadow-brand-ink/40">
              {submitted ? (
                <div className="py-6 text-center" role="status">
                  <div className="mx-auto w-14 h-14 rounded-full bg-mint/20 grid place-items-center">
                    <i className="fas fa-check text-2xl text-brand" aria-hidden="true"></i>
                  </div>
                  <h2 className="mt-5 font-display font-black uppercase text-3xl">You're on the list</h2>
                  <p className="mt-2 text-brand-ink/70">We'll email {email} when the next cohort near {zipcode} opens.</p>
                </div>
              ) : (
                <>
                  <h2 className="font-display font-black uppercase text-3xl md:text-4xl leading-none pr-16 sm:pr-24">Not ready to apply?</h2>
                  <p className="mt-3 text-brand-ink/70">
                    Get updates on upcoming cohorts, organizing toolkits, and events near you.
                  </p>
                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="hero-email" className="block text-sm font-semibold mb-1.5">Email</label>
                      <input
                        id="hero-email"
                        required
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-brand-ink/15 bg-paper px-4 py-3.5 text-base placeholder:text-brand-ink/40 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label htmlFor="hero-zip" className="block text-sm font-semibold mb-1.5">ZIP code</label>
                      <input
                        id="hero-zip"
                        required
                        type="text"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        pattern="[0-9]{5}"
                        maxLength={5}
                        placeholder="57104"
                        value={zipcode}
                        onChange={(e) => setZipcode(e.target.value.replace(/\D/g, ''))}
                        aria-describedby="hero-zip-hint"
                        className="w-full rounded-xl border border-brand-ink/15 bg-paper px-4 py-3.5 text-base placeholder:text-brand-ink/40 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none transition"
                      />
                      <p id="hero-zip-hint" className="mt-1.5 text-xs text-brand-ink/60">Used to match you with the nearest cohort.</p>
                    </div>
                    <input
                      type="text"
                      name="company"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="absolute -left-[9999px] w-px h-px opacity-0"
                    />
                    {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full rounded-xl bg-brand px-6 py-4 text-base font-bold text-white hover:bg-brand-deep transition-colors disabled:opacity-60 disabled:cursor-wait"
                    >
                      {sending ? 'Signing you up…' : 'Keep me posted'}
                    </button>
                    <p className="text-xs text-center text-brand-ink/50">No spam. Unsubscribe anytime.</p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
