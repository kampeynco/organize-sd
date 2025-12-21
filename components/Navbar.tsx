
import React, { useState, useEffect } from 'react';

interface NavbarProps {
  onHomeClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onHomeClick }) => {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const smoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setIsMenuOpen(false); // Close mobile menu on click
    onHomeClick();
    
    // Use a small timeout to ensure content is rendered before scrolling
    setTimeout(() => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else if (targetId === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 10);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || isMenuOpen ? 'bg-[#311b92] shadow-lg py-2' : 'bg-[#311b92]/90 backdrop-blur-sm py-4'}`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        {/* Branding section */}
        <div className="flex items-center">
          <a 
            href="#" 
            onClick={(e) => { 
              e.preventDefault(); 
              onHomeClick(); 
              setIsMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' }); 
            }} 
            className="text-white font-black tracking-tighter text-xl md:text-2xl cursor-pointer"
          >
            ORGANIZE SD
          </a>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6 text-white text-sm font-bold uppercase tracking-wider">
          <a href="#who-we-are" onClick={(e) => smoothScroll(e, 'who-we-are')} className="hover:text-teal-400 transition-colors">Who We Are</a>
          <a href="#mission" onClick={(e) => smoothScroll(e, 'mission')} className="hover:text-teal-400 transition-colors">Mission</a>
          <a href="#training" onClick={(e) => smoothScroll(e, 'training')} className="hover:text-teal-400 transition-colors">Training</a>
          <a href="#schedule" onClick={(e) => smoothScroll(e, 'schedule')} className="hover:text-teal-400 transition-colors">Schedule</a>
          <div className="flex gap-2 ml-4">
            <a 
                href="#training" 
                onClick={(e) => smoothScroll(e, 'training')}
                className="bg-teal-400 hover:bg-teal-300 text-[#311b92] px-6 py-2 rounded-sm text-xs font-bold transition-colors inline-block text-center"
            >
                APPLY
            </a>
            <a 
                href="#donate" 
                onClick={(e) => smoothScroll(e, 'donate')}
                className="bg-rose-500 hover:bg-rose-400 px-6 py-2 rounded-sm text-xs font-bold transition-colors inline-block text-center"
            >
                DONATE
            </a>
          </div>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white text-2xl p-2 focus:outline-none"
              aria-label="Toggle Menu"
            >
              <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
            </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-[500px] border-t border-white/10' : 'max-h-0'}`}>
        <div className="bg-[#311b92] px-4 py-6 flex flex-col space-y-4 text-white text-sm font-bold uppercase tracking-wider">
          <a href="#who-we-are" onClick={(e) => smoothScroll(e, 'who-we-are')} className="hover:text-teal-400 transition-colors py-2 border-b border-white/5">Who We Are</a>
          <a href="#mission" onClick={(e) => smoothScroll(e, 'mission')} className="hover:text-teal-400 transition-colors py-2 border-b border-white/5">Mission</a>
          <a href="#training" onClick={(e) => smoothScroll(e, 'training')} className="hover:text-teal-400 transition-colors py-2 border-b border-white/5">Training</a>
          <a href="#schedule" onClick={(e) => smoothScroll(e, 'schedule')} className="hover:text-teal-400 transition-colors py-2 border-b border-white/5">Schedule</a>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <a 
                href="#training" 
                onClick={(e) => smoothScroll(e, 'training')}
                className="bg-teal-400 hover:bg-teal-300 text-[#311b92] px-6 py-3 rounded-sm text-center"
            >
                APPLY
            </a>
            <a 
                href="#donate" 
                onClick={(e) => smoothScroll(e, 'donate')}
                className="bg-rose-500 hover:bg-rose-400 text-white px-6 py-3 rounded-sm text-center"
            >
                DONATE
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};
