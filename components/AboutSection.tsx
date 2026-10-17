
import React from 'react';
import { Icon } from './Icon';
import { faArrowTrendUp, faBullhorn, faMinus, faSeedling } from '@fortawesome/free-solid-svg-icons';

const AUDIENCES = [
  { icon: faSeedling, title: 'First-time organizers', text: "You're a Democrat or progressive who cares about your community and wants to learn how to move people." },
  { icon: faArrowTrendUp, title: 'Rising field staff', text: 'You have some campaign experience and want to run a program, not just a shift.' },
  { icon: faBullhorn, title: 'Volunteer leaders', text: 'You already lead people locally and want proven systems to grow your team.' },
];

const NOT_US = [
  "We're not a campaign and don't replace campaign field teams.",
  "We don't run daily canvassing as our primary function.",
  "We don't manage campaigns' internal data, targeting, or paid media.",
  "We don't contribute to candidates or candidate committees.",
];

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="bg-paper py-24 md:py-32 scroll-mt-20">
      <div className="container mx-auto px-5 max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Who it's for</p>
        <h2 className="mt-4 font-display font-black uppercase text-brand-ink text-5xl md:text-6xl leading-[0.9] max-w-3xl">
          Built for people ready to lead
        </h2>

        <div className="mt-14 grid lg:grid-cols-12 gap-6">
          <ul className="lg:col-span-7 grid sm:grid-cols-3 lg:grid-cols-1 gap-4">
            {AUDIENCES.map((a) => (
              <li key={a.title} className="flex flex-col lg:flex-row gap-5 rounded-3xl bg-white p-7 ring-1 ring-brand-ink/5">
                <span className="grid place-items-center w-12 h-12 rounded-2xl bg-brand text-mint shrink-0">
                  <Icon icon={a.icon} />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-brand-ink">{a.title}</h3>
                  <p className="mt-1 text-brand-ink/70 leading-relaxed">{a.text}</p>
                </div>
              </li>
            ))}
          </ul>

          <aside className="lg:col-span-5 rounded-3xl bg-paper-dark/70 p-8 md:p-10 ring-1 ring-brand-ink/10">
            <h3 className="font-display font-black uppercase text-3xl text-brand-ink">What we don't do</h3>
            <p className="mt-2 text-brand-ink/70">We focus on training first, so campaigns can focus on winning.</p>
            <ul className="mt-6 space-y-4">
              {NOT_US.map((item) => (
                <li key={item} className="flex gap-3 text-brand-ink/80 leading-relaxed">
                  <Icon icon={faMinus} className="mt-1.5 text-signal shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 pt-6 border-t border-brand-ink/10 text-sm text-brand-ink/60">
              Organize SD is a Section 527 political organization focused on training-first capacity building.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
};
