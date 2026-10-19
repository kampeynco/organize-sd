
import React from "react";

const OUTCOMES = [
  { stat: "01", title: "More trained organizers", text: "Operatives placed on campaigns and community programs across the state." },
  { stat: "02", title: "Stronger volunteer programs", text: "Leadership pipelines that keep growing after the training weekend ends." },
  { stat: "03", title: "Better voter contact", text: "Higher-quality conversations, and more of them, up and down the ballot." },
];

export const MissionStatement: React.FC = () => {
  return (
    <section id="mission" className="bg-paper py-24 md:py-32 scroll-mt-20">
      <div className="container mx-auto px-5 max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Our mission</p>
        <div className="mt-4 grid lg:grid-cols-12 gap-6 lg:gap-12 lg:items-end">
          <h2 className="lg:col-span-7 font-display font-black uppercase text-brand-ink text-5xl md:text-7xl leading-[0.9] tracking-tight">
            Training a new generation of South Dakota organizers.
          </h2>
          <p className="lg:col-span-5 text-lg md:text-xl leading-relaxed text-brand-ink/75 lg:border-l-4 lg:border-signal lg:pl-8">
            Organize SD is a training initiative for progressive South Dakotans. We develop high-skill grassroots operatives who can
            build and run effective organizing programs for federal, state, and local races, then stay to
            lead in their own communities.
          </p>
        </div>

        {/* Goals */}
        <div className="mt-16">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-brand-ink/60">What success looks like by November 2028</h3>
          <ol className="mt-6 grid md:grid-cols-3 gap-px bg-brand-ink/10 rounded-3xl overflow-hidden ring-1 ring-brand-ink/10">
            {OUTCOMES.map((o) => (
              <li key={o.stat} className="bg-white p-8 md:p-10">
                <span className="font-display font-black text-6xl text-signal leading-none" aria-hidden="true">{o.stat}</span>
                <p className="mt-6 text-xl font-bold text-brand-ink">{o.title}</p>
                <p className="mt-2 text-brand-ink/70 leading-relaxed">{o.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
};
