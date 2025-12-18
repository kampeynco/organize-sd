
import React, { useState, useEffect } from 'react';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#311b92] shadow-lg py-2' : 'bg-[#311b92]/90 backdrop-blur-sm py-4'}`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        {/* Branding section: OSD box logo removed, ORGANIZE SD text restored */}
        <div className="flex items-center">
          <span className="text-white font-black tracking-tighter text-xl md:text-2xl">
            ORGANIZE SD
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-6 text-white text-sm font-bold uppercase tracking-wider">
          <a href="#" className="hover:text-teal-400 transition-colors">Our Mission</a>
          <a href="#about" className="hover:text-teal-400 transition-colors">Our Training</a>
          <a href="#join" className="hover:text-teal-400 transition-colors">Our Team</a>
          <div className="flex gap-2 ml-4">
            <button className="bg-rose-500 hover:bg-rose-400 px-4 py-2 rounded-sm text-xs font-bold transition-colors">DONATE</button>
          </div>
        </div>

        <div className="md:hidden flex items-center gap-3">
            <span className="text-white text-xs font-bold uppercase">🇺🇸 Español</span>
            <button className="text-white text-2xl p-2"><i className="fas fa-bars"></i></button>
        </div>
      </div>
    </nav>
  );
};
