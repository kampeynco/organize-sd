
import React from 'react';

const DonationButton: React.FC<{ amount: string }> = ({ amount }) => (
    <button className="border-4 border-teal-400 text-teal-400 hover:bg-teal-400 hover:text-[#311b92] transition-all py-6 px-4 rounded-lg font-black text-3xl md:text-4xl uppercase tracking-tighter">
        {amount}
    </button>
);

export const DonationGrid: React.FC = () => {
  return (
    <section id="donate" className="py-24 bg-[#4a148c] text-white text-center">
      <div className="container mx-auto px-4 max-w-5xl">
        <h2 className="text-5xl md:text-7xl font-black mb-12 italic uppercase text-teal-300">Support the Training!</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <DonationButton amount="$20" />
          <DonationButton amount="$35" />
          <DonationButton amount="$50" />
          <DonationButton amount="$100" />
          <DonationButton amount="$500" />
          <DonationButton amount="$2.5k" />
          <button className="col-span-2 border-4 border-teal-400 text-teal-400 hover:bg-teal-400 hover:text-[#311b92] transition-all py-6 px-4 rounded-lg font-black text-3xl md:text-4xl uppercase tracking-tighter">
            Other
          </button>
        </div>
        <p className="mt-12 text-gray-300 text-sm max-w-2xl mx-auto">
            Your support goes directly to operative training materials, scholarships for trainees, and the infrastructure needed to build a professionalized grassroots workforce for South Dakota.
        </p>
      </div>
    </section>
  );
};
