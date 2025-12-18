
import React, { useState, useEffect } from 'react';

export const StickyOptIn: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [zipcode, setZipcode] = useState('');

  useEffect(() => {
    const toggleVisibility = () => {
      const aboutSection = document.getElementById('about');
      if (aboutSection) {
        const rect = aboutSection.getBoundingClientRect();
        // Becomes visible once the bottom of the "About" section is above the top of the viewport
        if (rect.bottom < 0) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      } else {
        // Fallback if section not found
        if (window.pageYOffset > 1500) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Sticky form submitted:', { email, zipcode });
    alert(`Thanks for joining! We'll be in touch at ${email}.`);
    setEmail('');
    setZipcode('');
  };

  return (
    <div className={`fixed bottom-0 left-0 w-full bg-[#311b92] border-t-4 border-teal-400 p-4 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] transition-transform duration-500 transform ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="container mx-auto max-w-6xl">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-4">
          <div className="hidden lg:block text-white font-black uppercase italic text-lg whitespace-nowrap mr-4">
            Join the team <i className="fas fa-arrow-right text-teal-400 ml-2"></i>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full gap-2">
            <input
              required
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-grow bg-white text-[#311b92] px-4 py-2 rounded font-bold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <input
              required
              type="text"
              pattern="[0-9]*"
              maxLength={5}
              placeholder="Zip"
              value={zipcode}
              onChange={(e) => setZipcode(e.target.value)}
              className="w-full sm:w-24 bg-white text-[#311b92] px-4 py-2 rounded font-bold text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          
          <button 
            type="submit"
            className="w-full md:w-auto bg-orange-400 hover:bg-orange-300 text-[#311b92] font-black uppercase text-sm px-8 py-2 rounded transition-all shadow-md active:scale-95 whitespace-nowrap"
          >
            Recruit Me
          </button>
        </form>
      </div>
    </div>
  );
};
