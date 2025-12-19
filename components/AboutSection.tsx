
import React from 'react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-24 bg-cover bg-center relative" style={{ backgroundImage: `url('https://picsum.photos/seed/sd-skyline/1920/800')` }}>
      <div className="absolute inset-0 bg-[#311b92]/95"></div>
      <div className="container mx-auto px-4 relative z-10 text-white max-w-5xl">
        <h2 className="text-4xl md:text-6xl font-black mb-6 border-b-4 border-teal-400 inline-block uppercase tracking-tighter">Who This Is For</h2>
        <div className="grid md:grid-cols-2 gap-12 mt-12">
            <div className="space-y-6">
                <p className="text-xl leading-relaxed font-semibold">
                    Organize SD is designed for first-time and rising organizers, field directors, and volunteer leaders who want to leaarn how to build grassroots capacity effectively.
                </p>
                <div className="bg-white/10 p-6 rounded-xl backdrop-blur-sm border border-white/20">
                    <h3 className="text-orange-400 font-bold uppercase mb-4 tracking-widest">What we don’t do</h3>
                    <ul className="space-y-3 text-sm">
                        <li className="flex gap-2"><i className="fas fa-times-circle text-rose-500"></i> <span>We are not a campaign and don't replace campaign field teams.</span></li>
                        <li className="flex gap-2"><i className="fas fa-times-circle text-rose-500"></i> <span>We do not run daily canvassing as our primary function.</span></li>
                        <li className="flex gap-2"><i className="fas fa-times-circle text-rose-500"></i> <span>We do not manage campaigns' internal data, targeting, or paid media.</span></li>
                        <li className="flex gap-2"><i className="fas fa-times-circle text-rose-500"></i> <span>We do not contribute to candidates or candidate committees.</span></li>
                    </ul>
                </div>
            </div>
            <div className="space-y-8">
                <div>
                    <h3 className="text-2xl font-bold mb-4 uppercase text-teal-400">Success by Nov 2026</h3>
                    <ul className="space-y-4">
                        <li className="flex items-center gap-4">
                            <span className="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center font-bold text-lg shrink-0">1</span>
                            <span>More trained operatives placed on campaigns and community programs</span>
                        </li>
                        <li className="flex items-center gap-4">
                            <span className="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center font-bold text-lg shrink-0">2</span>
                            <span>Stronger volunteer programs and leadership pipelines statewide</span>
                        </li>
                        <li className="flex items-center gap-4">
                            <span className="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center font-bold text-lg shrink-0">3</span>
                            <span>Higher-quality voter contact (and more of it) across the ballot</span>
                        </li>
                    </ul>
                </div>
                <div className="pt-4">
                  <p className="text-xs opacity-70 italic">
                    Organize SD is a Section 527 political organization focused on training-first capacity building.
                  </p>
                </div>
            </div>
        </div>
      </div>
    </section>
  );
};
