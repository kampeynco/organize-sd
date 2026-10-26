
import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { Icon } from './Icon';
import { faBars, faXmark } from '@fortawesome/free-solid-svg-icons';

interface NavbarProps {
  onHomeClick: () => void;
  onApplyClick: () => void;
  onResultsClick: () => void;
}

const DONATE_URL = 'https://secure.actblue.com/donate/organize-sd?refcode=website&amount=100';
const DONATE_BAR_URL = 'https://secure.actblue.com/donate/organize-sd?refcode=webbar&amount=100';

const NAV_LINKS = [
  { id: 'mission', label: 'Mission' },
  { id: 'training', label: 'Training' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'who-we-are', label: 'Who We Are' },
];

export const Navbar: React.FC<NavbarProps> = ({ onHomeClick, onApplyClick, onResultsClick }) => {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openResults = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setIsMenuOpen(false);
    onResultsClick();
  };

  const smoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setIsMenuOpen(false);
    onHomeClick();

    // Wait a tick so the home view is rendered before scrolling
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
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled || isMenuOpen ? 'bg-brand-deep/95 backdrop-blur-md shadow-lg shadow-brand-ink/20' : 'bg-transparent'
      }`}
    >
      {/* Mobile donate bar; pages below lg pad their tops to clear it */}
      <a
        href={DONATE_BAR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="lg:hidden block py-2.5 px-5 text-center text-sm font-bold text-white bg-ember hover:bg-ember-light transition-colors"
      >
        Donate to Organize SD <span aria-hidden="true">→</span>
      </a>

      <nav
        className={`container mx-auto px-5 flex justify-between items-center transition-[padding] duration-300 ${
          scrolled || isMenuOpen ? 'py-3' : 'py-5'
        }`}
        aria-label="Main"
      >
        <a
          href="/"
          onClick={(e) => smoothScroll(e, 'top')}
          className="flex items-center"
          aria-label="Organize SD home"
        >
          <Logo
            priority
            sizes="(min-width: 768px) 124px, 96px"
            className={`transition-[height] duration-300 ${scrolled || isMenuOpen ? 'h-12 md:h-14' : 'h-14 md:h-[4.5rem]'}`}
          />
        </a>

        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-8">
          <ul className="flex items-center gap-7 text-[15px] font-semibold text-white/80">
            {NAV_LINKS.map((link) => (
              <li key={link.id}>
                <a href={`#${link.id}`} onClick={(e) => smoothScroll(e, link.id)} className="hover:text-white transition-colors">
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a href="/results" onClick={openResults} className="hover:text-white transition-colors">
                Results
              </a>
            </li>
          </ul>
          <div className="flex items-center gap-3">
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-full text-sm font-bold text-white bg-ember hover:bg-ember-light transition-colors"
            >
              Donate
            </a>
            <button
              onClick={() => { setIsMenuOpen(false); onApplyClick(); }}
              className="px-5 py-2.5 rounded-full text-sm font-bold bg-signal text-brand-ink hover:bg-signal-light transition-colors"
            >
              Apply now
            </button>
          </div>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="lg:hidden text-white w-11 h-11 grid place-items-center rounded-full hover:bg-white/10"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
        >
          <Icon icon={isMenuOpen ? faXmark : faBars} className="text-xl" />
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={`lg:hidden overflow-hidden transition-[max-height] duration-300 ease-out ${isMenuOpen ? 'max-h-[480px]' : 'max-h-0'}`}
      >
        <div className="container mx-auto px-5 pt-4 pb-6 flex flex-col text-white">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => smoothScroll(e, link.id)}
              className="py-3 text-lg font-semibold border-b border-white/10 hover:text-signal transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/results"
            onClick={openResults}
            className="py-3 text-lg font-semibold border-b border-white/10 hover:text-signal transition-colors"
          >
            Results
          </a>
          <div className="grid grid-cols-2 gap-3 pt-5">
            <a
              href={DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 rounded-full text-center font-bold bg-ember hover:bg-ember-light transition-colors"
            >
              Donate
            </a>
            <button
              onClick={() => { setIsMenuOpen(false); onApplyClick(); }}
              className="py-3 rounded-full font-bold bg-signal text-brand-ink"
            >
              Apply now
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
