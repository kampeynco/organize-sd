
import React, { useState } from 'react';
import { submitSignup } from '../lib/signup';
import { Icon } from './Icon';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';

export const ContactSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [zip, setZip] = useState('');
  const [company, setCompany] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await submitSignup('newsletter', email, zip, company);
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="newsletter" className="bg-paper py-24 scroll-mt-20">
      <div className="container mx-auto px-5 max-w-6xl">
        <div className="rounded-[2rem] bg-mint px-7 py-12 md:p-14 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-display font-black uppercase text-brand-ink text-5xl md:text-6xl leading-[0.9]">Stay in the loop</h2>
            <p className="mt-4 text-lg text-brand-ink/80 max-w-md">
              Updates on training cohorts, organizing toolkits, and the 2028 strategy. Weekly at most.
            </p>
          </div>

          {submitted ? (
            <p role="status" className="rounded-2xl bg-white p-8 text-lg font-semibold text-brand-ink">
              <Icon icon={faCircleCheck} className="text-brand mr-2" />
              Thanks! You're subscribed at {email}.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="grid sm:grid-cols-[1fr_7rem] gap-3">
              <div>
                <label htmlFor="news-email" className="block text-sm font-bold text-brand-ink mb-1.5">Email</label>
                <input
                  id="news-email"
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl bg-white px-4 py-3.5 text-brand-ink placeholder:text-brand-ink/40 ring-1 ring-brand-ink/10 focus:ring-2 focus:ring-brand focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="news-zip" className="block text-sm font-bold text-brand-ink mb-1.5">ZIP</label>
                <input
                  id="news-zip"
                  required
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  pattern="[0-9]{5}"
                  maxLength={5}
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))}
                  placeholder="57104"
                  className="w-full rounded-xl bg-white px-4 py-3.5 text-brand-ink placeholder:text-brand-ink/40 ring-1 ring-brand-ink/10 focus:ring-2 focus:ring-brand focus:outline-none"
                />
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
              {error && <p role="alert" className="sm:col-span-2 text-sm font-semibold text-red-800">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="sm:col-span-2 rounded-xl bg-brand-ink py-4 font-bold text-white hover:bg-brand transition-colors disabled:opacity-60 disabled:cursor-wait"
              >
                {sending ? 'Signing you up…' : 'Sign me up'}
              </button>
              <p className="sm:col-span-2 text-sm text-brand-ink/70">No spam. Unsubscribe anytime.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
