
import React, { useState } from 'react';

export const ContactSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [zip, setZip] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Newsletter signup:', { email, zip });
    alert('You have been subscribed to the Organize SD newsletter!');
    setEmail('');
    setZip('');
  };

  return (
    <section id="newsletter" className="py-24 bg-teal-400 scroll-mt-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-black text-[#311b92] mb-4 uppercase tracking-tighter italic">Stay in the Loop</h2>
          <div className="w-24 h-2 bg-[#311b92] mx-auto"></div>
          <p className="mt-6 text-[#311b92] text-xl font-bold">Get the latest updates on training cohorts, organizing toolkits, and 2026 strategy.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#311b92] p-8 md:p-12 rounded-3xl shadow-2xl flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow w-full space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-teal-400 ml-1">Email Address</label>
            <input 
              required
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="organize@example.com"
              className="w-full p-4 bg-white/10 border-2 border-white/20 text-white rounded-xl focus:border-orange-400 focus:outline-none transition-colors placeholder-white/30" 
            />
          </div>
          <div className="w-full md:w-32 space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-teal-400 ml-1">Zip</label>
            <input 
              required
              type="text" 
              pattern="[0-9]*"
              maxLength={5}
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="57104"
              className="w-full p-4 bg-white/10 border-2 border-white/20 text-white rounded-xl focus:border-orange-400 focus:outline-none transition-colors placeholder-white/30" 
            />
          </div>
          <button 
            type="submit"
            className="w-full md:w-auto bg-orange-400 hover:bg-orange-300 text-[#311b92] font-black uppercase px-8 py-5 rounded-xl text-lg transition-all shadow-xl active:scale-95 whitespace-nowrap"
          >
            I'm in
          </button>
        </form>
        <p className="text-center mt-6 text-[#311b92]/70 text-sm font-bold uppercase tracking-widest">
            Weekly updates. No spam. Just power.
        </p>
      </div>
    </section>
  );
};
