
import React from 'react';

export const CommitmentSection: React.FC = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Commit Column */}
          <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl border-t-8 border-rose-500 transform transition-transform hover:-translate-y-1">
            <h3 className="text-3xl font-black text-[#311b92] mb-8 uppercase tracking-tighter italic flex items-center gap-3">
              <i className="fas fa-fist-raised text-rose-500 text-2xl"></i>
              What You Commit
            </h3>
            <ul className="space-y-6">
              <li className="flex gap-4 items-start">
                <i className="fas fa-check-circle text-rose-500 text-xl mt-1 shrink-0"></i>
                <div className="text-lg text-gray-800 leading-relaxed">
                  <span className="font-bold">3-day weekend cohort</span> (Fri–Sun)
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <i className="fas fa-check-circle text-rose-500 text-xl mt-1 shrink-0"></i>
                <div className="text-lg text-gray-800 leading-relaxed">
                  <span className="font-bold">Show up ready to practice</span> (roleplays, scripts, turf, follow-ups)
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <i className="fas fa-check-circle text-rose-500 text-xl mt-1 shrink-0"></i>
                <div className="text-lg text-gray-800 leading-relaxed">
                  <span className="font-bold">Stay connected after</span> (peer network + coaching check-ins)
                </div>
              </li>
            </ul>
          </div>

          {/* Get Column */}
          <div className="bg-[#311b92] p-8 md:p-10 rounded-3xl shadow-xl border-t-8 border-teal-400 text-white transform transition-transform hover:-translate-y-1">
            <h3 className="text-3xl font-black text-white mb-8 uppercase tracking-tighter italic flex items-center gap-3">
              <i className="fas fa-hand-holding-heart text-teal-400 text-2xl"></i>
              What You Get
            </h3>
            <ul className="space-y-6">
              <li className="flex gap-4 items-start">
                <i className="fas fa-star text-teal-400 text-xl mt-1 shrink-0"></i>
                <div className="text-lg leading-relaxed">
                  <span className="font-bold">Job-ready field skills</span> (recruiting, persuasion, turf, volunteer leadership)
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <i className="fas fa-star text-teal-400 text-xl mt-1 shrink-0"></i>
                <div className="text-lg leading-relaxed">
                  <span className="font-bold">A statewide network</span> of organizers, leaders, and campaign teams
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
