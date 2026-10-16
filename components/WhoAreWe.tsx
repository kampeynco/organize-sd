
import React from 'react';

export const WhoAreWe: React.FC = () => {
  return (
    <section id="who-we-are" className="bg-white py-24 md:py-32 scroll-mt-20 overflow-hidden">
      <div className="container mx-auto px-5 max-w-6xl">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-5">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-brand">Who we are</p>
            <h2 className="mt-4 font-display font-black uppercase text-brand-ink text-5xl md:text-6xl leading-[0.9]">
              Organizers who've done it before
            </h2>
            <p className="mt-6 text-lg text-brand-ink/75 leading-relaxed">
              A collective of former Obama organizers and battle-tested South Dakota operatives. We helped build the
              community organizing framework that won battleground states twice, and we're bringing it home.
            </p>

            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-paper p-6">
                <h3 className="font-bold text-brand-ink">Proven frameworks</h3>
                <p className="mt-1.5 text-sm text-brand-ink/70 leading-relaxed">Scaling voter contact through structured volunteer teams and the Snowflake model.</p>
              </div>
              <div className="rounded-2xl bg-paper p-6">
                <h3 className="font-bold text-brand-ink">Local expertise</h3>
                <p className="mt-1.5 text-sm text-brand-ink/70 leading-relaxed">Deep roots in SD communities, so national best practices work for the 605.</p>
              </div>
            </div>
          </div>

          <figure className="lg:col-span-7 relative rounded-[2rem] bg-brand text-white p-10 md:p-14 grain isolate overflow-hidden">
            <i className="fas fa-quote-left absolute -top-4 right-8 text-[10rem] text-white/[0.06]" aria-hidden="true"></i>
            <blockquote className="font-display font-extrabold text-3xl md:text-[2.75rem] leading-[1.05]">
              “We aren't just consultants. We're the people who were on the ground in 2008 and 2012, and we're bringing
              that same relentless organizing framework to South Dakota.”
            </blockquote>
            <figcaption className="mt-8 flex items-center gap-3 text-sm font-bold uppercase tracking-[0.15em] text-mint">
              <span className="w-10 h-0.5 bg-mint" aria-hidden="true"></span>
              The Organize SD collective
            </figcaption>
            <p className="mt-10 pt-8 border-t border-white/15 text-white/80 leading-relaxed">
              Now we're focused on 2028: training the next generation of South Dakota leaders to build permanent
              infrastructure that wins, neighborhood by neighborhood, town by town.
            </p>
          </figure>
        </div>
      </div>
    </section>
  );
};
