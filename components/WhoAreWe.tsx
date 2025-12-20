
import React from 'react';

export const WhoAreWe: React.FC = () => {
  return (
    <section id="who-we-are" className="py-24 bg-white scroll-mt-20 overflow-hidden">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 relative">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-teal-400/20 rounded-full blur-3xl"></div>
            <div className="relative z-10 border-l-8 border-rose-500 pl-8 space-y-6">
              <h2 className="text-4xl md:text-6xl font-black text-[#311b92] uppercase italic tracking-tighter leading-none">
                Who <br />Are We?
              </h2>
              <p className="text-xl md:text-2xl font-bold text-gray-800 leading-tight">
                A powerhouse collective of former Obama campaign directors and battle-tested South Dakota organizers.
              </p>
            </div>
            <div className="mt-12 bg-[#311b92] p-8 rounded-3xl shadow-2xl text-white transform hover:rotate-1 transition-transform cursor-default">
              <p className="text-lg font-medium leading-relaxed italic">
                "We aren't just consultants; we're the people who were on the ground in 2008 and 2012. We're bringing that same relentless community organizing framework to South Dakota."
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-10 h-1 bg-teal-400"></div>
                <span className="uppercase tracking-widest text-xs font-black text-teal-400">The OSD Collective</span>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 space-y-8">
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-[#311b92] uppercase tracking-wide">Our DNA</h3>
              <p className="text-gray-700 text-lg leading-relaxed">
                We believe that power comes from the bottom up. Our team is composed of the same operatives who helped implement the community organizing framework that flipped battleground states twice for President Obama. 
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-gray-50 rounded-2xl border-b-4 border-teal-400">
                <h4 className="font-black text-[#311b92] uppercase text-sm tracking-widest mb-2">Proven Frameworks</h4>
                <p className="text-sm text-gray-600">Scaling voter contact through structured volunteer hierarchies and Snowflake models.</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-2xl border-b-4 border-rose-500">
                <h4 className="font-black text-[#311b92] uppercase text-sm tracking-widest mb-2">Local Expertise</h4>
                <p className="text-sm text-gray-600">Deep roots in SD communities, ensuring national best practices work for the 605.</p>
              </div>
            </div>

            <p className="text-gray-700 text-lg leading-relaxed">
              Now, we are focused on 2026. We are here to train the next generation of South Dakota leaders to build permanent infrastructure that wins—neighborhood by neighborhood, town by town.
            </p>
            
            <div className="pt-4">
              <a 
                href="#training" 
                className="inline-flex items-center gap-2 text-[#311b92] font-black uppercase tracking-widest hover:text-teal-600 transition-colors group"
              >
                Join our training pipeline <i className="fas fa-arrow-right group-hover:translate-x-2 transition-transform"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
