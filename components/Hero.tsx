
import React, { useState } from 'react';

export const Hero: React.FC = () => {
  const [email, setEmail] = useState('');
  const [zipcode, setZipcode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', { email, zipcode });
    // Handle the submission logic here
    alert(`Thanks for joining! We'll be in touch at ${email}.`);
  };

  return (
    <section className="relative min-h-[85vh] flex items-center pt-24 pb-12 overflow-hidden bg-[#311b92]">
      {/* Background visual remains a clean solid color */}
      
      <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
        <div className="text-white space-y-8 animate-fadeIn max-w-4xl">
          <h1 className="text-6xl md:text-9xl font-black leading-tight tracking-tighter uppercase italic">
            Train.<br />
            Organize.<br />
            Win.
          </h1>
          <p className="text-xl md:text-3xl font-semibold opacity-90 max-w-3xl mx-auto leading-relaxed">
            Developing high-skill grassroots operatives to build and run effective organizing programs across South Dakota for 2026 and beyond.
          </p>
          
          <div id="join" className="w-full max-w-3xl mx-auto pt-4 scroll-mt-24">
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
              <input
                required
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-grow bg-white/10 border-2 border-white/20 text-white placeholder-white/60 p-5 rounded-lg text-lg focus:outline-none focus:border-orange-400 transition-colors"
              />
              <input
                required
                type="text"
                pattern="[0-9]*"
                maxLength={5}
                placeholder="Zip"
                value={zipcode}
                onChange={(e) => setZipcode(e.target.value)}
                className="md:w-32 bg-white/10 border-2 border-white/20 text-white placeholder-white/60 p-5 rounded-lg text-lg focus:outline-none focus:border-orange-400 transition-colors"
              />
              <button 
                type="submit"
                className="bg-orange-400 hover:bg-orange-300 text-[#311b92] font-black text-xl px-8 py-5 rounded-lg transition-all hover:scale-105 shadow-2xl active:scale-95 whitespace-nowrap uppercase"
              >
                I'M IN
              </button>
            </form>
            <p className="text-xs md:text-sm text-white/70 mt-3 font-medium">
              <span className="font-bold">ZIP helps us route you to the nearest cohort and local updates.</span> No spam.
            </p>
          </div>
        </div>

        {/* Decorative blurred background elements for depth */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-teal-400/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-rose-500/10 rounded-full blur-[150px]"></div>
        </div>
      </div>
    </section>
  );
};
