
import React from 'react';

const PROGRAMS = [
    {
        kicker: 'Train',
        title: 'Grassroots fundamentals',
        text: 'In-person trainings on field, volunteer, and community organizing. You learn to build programs that last, not one-off events.',
        img: 'https://images.unsplash.com/photo-1622675363311-3e1904dc1885?q=80&w=900&auto=format&fit=crop',
        alt: 'Organizers working together around a table',
    },
    {
        kicker: 'Equip',
        title: 'Best-practice playbooks',
        text: 'Turf plans, universes, and contact goals, plus proven scripts and onboarding systems that turn conversations into action.',
        img: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=900&auto=format&fit=crop',
        alt: 'Hands reviewing a written plan',
    },
    {
        kicker: 'Connect',
        title: 'Coaching & peer support',
        text: 'Office hours with experienced organizers, tracking templates, and a statewide network of South Dakota operatives to learn alongside.',
        img: 'https://images.unsplash.com/photo-1603202662706-62ead3176b8f?q=80&w=900&auto=format&fit=crop',
        alt: 'Two people talking and smiling',
    },
];

export const Features: React.FC = () => {
    return (
        <section id="training" className="bg-white py-24 md:py-32 scroll-mt-20">
            <div className="container mx-auto px-5 max-w-6xl">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">What we do</p>
                        <h2 className="mt-4 font-display font-black uppercase text-brand-ink text-5xl md:text-6xl leading-[0.9]">
                            Skills that win elections
                        </h2>
                    </div>
                    <p className="max-w-md text-lg text-brand-ink/70 leading-relaxed">
                        Every trainee leaves with the skills, tools, and relationships to run a real field program.
                    </p>
                </div>

                <div className="mt-14 grid md:grid-cols-3 gap-6">
                    {PROGRAMS.map((p) => (
                        <article key={p.kicker} className="group flex flex-col rounded-3xl bg-paper overflow-hidden ring-1 ring-brand-ink/5">
                            <div className="aspect-[4/3] overflow-hidden">
                                <img
                                    src={p.img}
                                    alt={p.alt}
                                    loading="lazy"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            </div>
                            <div className="p-7 md:p-8">
                                <p className="font-display font-black uppercase text-signal text-2xl leading-none">{p.kicker}</p>
                                <h3 className="mt-3 text-xl font-bold text-brand-ink">{p.title}</h3>
                                <p className="mt-3 text-brand-ink/70 leading-relaxed">{p.text}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
};
