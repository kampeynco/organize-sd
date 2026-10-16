
import React, { useState } from 'react';

interface HowItWorksProps {
    onApplyClick: () => void;
}

const STEPS = [
    {
        n: '1',
        title: 'Apply',
        text: 'Tell us about yourself, where you organize, and your availability. It takes a few minutes.',
    },
    {
        n: '2',
        title: 'Train',
        text: 'Spend a Friday–Sunday weekend practicing the real work: roleplays, scripts, turf, and follow-ups.',
    },
    {
        n: '3',
        title: 'Organize',
        text: 'Go home with job-ready field skills, coaching check-ins, and a statewide network behind you.',
    },
];

type Day = 'friday' | 'saturday' | 'sunday';

const SCHEDULE: Record<Day, { label: string; tagline: string; items: { time: string; title: string }[] }> = {
    friday: {
        label: 'Friday',
        tagline: 'Arrival & foundations',
        items: [
            { time: '3:00 – 5:00 PM', title: 'Check in' },
            { time: '5:00 – 6:00 PM', title: 'Welcome & introductions' },
            { time: '6:00 – 6:30 PM', title: 'Itinerary review' },
            { time: '6:30 – 7:30 PM', title: 'Dinner' },
            { time: '7:30 – 9:00 PM', title: 'What is organizing?' },
        ],
    },
    saturday: {
        label: 'Saturday',
        tagline: 'Skills & simulations',
        items: [
            { time: '8:00 – 9:00 AM', title: 'Check in / light breakfast' },
            { time: '9:00 – 9:30 AM', title: 'Welcome / itinerary review' },
            { time: '9:30 – 11:00 AM', title: 'Fundamentals of field' },
            { time: '11:00 AM – 1:00 PM', title: 'Lunch' },
            { time: '1:00 – 2:30 PM', title: 'Basics of VAN' },
            { time: '2:30 – 3:30 PM', title: 'Tech in organizing' },
            { time: '3:30 – 5:00 PM', title: 'Field simulations' },
            { time: '5:00 – 7:00 PM', title: 'Q&A' },
        ],
    },
    sunday: {
        label: 'Sunday',
        tagline: 'Strategy & next steps',
        items: [
            { time: '8:00 – 9:00 AM', title: 'Check in / light breakfast' },
            { time: '9:00 – 9:30 AM', title: 'Welcome / itinerary review' },
            { time: '9:30 – 11:00 AM', title: 'Coalition building 101' },
            { time: '11:00 AM – 1:00 PM', title: 'Lunch' },
            { time: '1:00 – 3:00 PM', title: 'Basics of grassroots fundraising' },
            { time: '3:00 – 5:00 PM', title: 'Organizing meet & greets / impact events' },
        ],
    },
};

const DAYS: Day[] = ['friday', 'saturday', 'sunday'];

export const HowItWorks: React.FC<HowItWorksProps> = ({ onApplyClick }) => {
    const [activeDay, setActiveDay] = useState<Day>('friday');
    const current = SCHEDULE[activeDay];

    const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const i = DAYS.indexOf(activeDay);
        const next = DAYS[(i + (e.key === 'ArrowRight' ? 1 : DAYS.length - 1)) % DAYS.length];
        setActiveDay(next);
        document.getElementById(`tab-${next}`)?.focus();
    };

    return (
        <section id="how-it-works" className="grain relative isolate overflow-hidden bg-brand-deep text-white py-24 md:py-32 scroll-mt-20">
            <div className="container mx-auto px-5 max-w-6xl">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-mint">How it works</p>
                <h2 className="mt-4 font-display font-black uppercase text-5xl md:text-7xl leading-[0.9]">
                    From application<br className="hidden md:block" /> to the field
                </h2>

                <ol className="mt-14 grid md:grid-cols-3 gap-10 md:gap-8">
                    {STEPS.map((s, i) => (
                        <li key={s.n} className="relative">
                            <div className="flex items-center gap-4">
                                <span className="grid place-items-center w-14 h-14 rounded-full bg-signal text-brand-ink font-display font-black text-3xl shrink-0">
                                    {s.n}
                                </span>
                                {i < STEPS.length - 1 && <span className="hidden md:block h-px flex-1 bg-white/20" aria-hidden="true"></span>}
                            </div>
                            <h3 className="mt-6 font-display font-black uppercase text-3xl">{s.title}</h3>
                            <p className="mt-2 text-white/75 leading-relaxed max-w-xs">{s.text}</p>
                        </li>
                    ))}
                </ol>

                {/* Weekend schedule */}
                <div id="schedule" className="mt-20 rounded-3xl bg-white text-brand-ink p-6 md:p-10 scroll-mt-28">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h3 className="font-display font-black uppercase text-4xl leading-none">The training weekend</h3>
                            <p className="mt-2 text-brand-ink/70">A look inside the 3-day immersive intensive.</p>
                        </div>
                        <button
                            onClick={onApplyClick}
                            className="self-start md:self-auto inline-flex items-center gap-2 rounded-full bg-signal px-7 py-3.5 font-bold text-brand-ink hover:bg-signal-light transition-colors"
                        >
                            Apply now <i className="fas fa-arrow-right" aria-hidden="true"></i>
                        </button>
                    </div>

                    <div role="tablist" aria-label="Training weekend days" className="mt-8 inline-flex rounded-full bg-paper p-1.5 gap-1">
                        {DAYS.map((day) => {
                            const isActive = activeDay === day;
                            return (
                                <button
                                    key={day}
                                    id={`tab-${day}`}
                                    role="tab"
                                    aria-selected={isActive}
                                    aria-controls="schedule-panel"
                                    tabIndex={isActive ? 0 : -1}
                                    onClick={() => setActiveDay(day)}
                                    onKeyDown={onTabKey}
                                    className={`rounded-full px-5 md:px-7 py-2.5 text-sm font-bold transition-colors ${
                                        isActive ? 'bg-brand text-white shadow' : 'text-brand-ink/70 hover:text-brand-ink'
                                    }`}
                                >
                                    {SCHEDULE[day].label}
                                </button>
                            );
                        })}
                    </div>

                    <div id="schedule-panel" role="tabpanel" aria-labelledby={`tab-${activeDay}`} className="mt-8">
                        <p className="text-sm font-bold uppercase tracking-[0.15em] text-brand">{current.tagline}</p>
                        <ol className="mt-4 divide-y divide-brand-ink/10 border-y border-brand-ink/10">
                            {current.items.map((item) => (
                                <li key={item.time + item.title} className="grid grid-cols-[8.5rem_1fr] md:grid-cols-[12rem_1fr] gap-4 py-4 items-baseline">
                                    <span className="text-sm font-semibold tabular-nums text-brand-ink/60">{item.time}</span>
                                    <span className="font-semibold text-brand-ink md:text-lg">{item.title}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        </section>
    );
};
