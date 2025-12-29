
import React from 'react';

const handleDonate = (amountStr: string) => {
    // Remove '$' and other non-numeric characters to get the raw number
    const amount = amountStr.replace(/[^0-9]/g, '');
    let url = 'https://secure.actblue.com/donate/organize-sd?refcode=webgrid';
    if (amount) {
        url += `&amount=${amount}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
};

const DonationButton: React.FC<{ amount: string }> = ({ amount }) => (
    <button 
        onClick={() => handleDonate(amount)}
        className="border-4 border-teal-400 text-teal-400 hover:bg-teal-400 hover:text-[#311b92] transition-all py-6 px-4 rounded-lg font-black text-3xl md:text-4xl uppercase tracking-tighter"
    >
        {amount}
    </button>
);

export const DonationGrid: React.FC = () => {
  return (
    <section id="donate" className="py-24 bg-[#4a148c] text-white text-center">
      <div className="container mx-auto px-4 max-w-5xl">
        <h2 className="text-5xl md:text-7xl font-black mb-6 italic uppercase text-teal-300">Support the Training!</h2>
        
        <div className="max-w-3xl mx-auto mb-10 space-y-4">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm md:text-base text-teal-200 font-bold uppercase tracking-wider opacity-90">
                <span><span className="text-white">$25</span> helps cover training materials</span>
                <span className="hidden md:inline">•</span>
                <span><span className="text-white">$100</span> helps cover travel support</span>
                <span className="hidden md:inline">•</span>
                <span><span className="text-white">$500</span> helps sponsor a trainee weekend</span>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <DonationButton amount="$10" />
          <DonationButton amount="$25" />
          <DonationButton amount="$50" />
          <DonationButton amount="$100" />
          <DonationButton amount="$250" />
          <DonationButton amount="$500" />
          <button 
            onClick={() => handleDonate('other')}
            className="col-span-2 border-4 border-teal-400 text-teal-400 hover:bg-teal-400 hover:text-[#311b92] transition-all py-6 px-4 rounded-lg font-black text-3xl md:text-4xl uppercase tracking-tighter"
          >
            Other
          </button>
        </div>
      </div>
    </section>
  );
};
