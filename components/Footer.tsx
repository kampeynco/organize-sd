
import React from 'react';

interface FooterProps {
  onContactClick: () => void;
  onPrivacyClick: () => void;
  onHomeClick: () => void;
  onApplyClick: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onContactClick, onPrivacyClick, onHomeClick, onApplyClick }) => {
  const smoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    onHomeClick();
    setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
    }, 10);
  };

  const linkClass = 'text-white/70 hover:text-white transition-colors';

  return (
    <footer className="bg-brand-ink text-white pt-20 pb-10">
      <div className="container mx-auto px-5 max-w-6xl">
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-5">
            <a
              href="/"
              onClick={(e) => smoothScroll(e, 'top')}
              className="font-display font-black uppercase text-5xl leading-none"
            >
              Organize SD
            </a>
            <p className="mt-4 max-w-sm text-white/70 leading-relaxed">
              Training South Dakotans to build and run grassroots organizing programs that win.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onApplyClick}
                className="rounded-full bg-signal px-6 py-3 text-sm font-bold text-brand-ink hover:bg-signal-light transition-colors"
              >
                Apply now
              </button>
              <a
                href="https://secure.actblue.com/donate/organize-sd?refcode=webfoot&amount=100"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full px-6 py-3 text-sm font-bold ring-1 ring-inset ring-white/30 hover:bg-white hover:text-brand-ink transition-colors"
              >
                Donate
              </a>
            </div>
          </div>

          <nav className="md:col-span-4 grid grid-cols-2 gap-8" aria-label="Footer">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-mint">Organize SD</h3>
              <ul className="mt-5 space-y-3">
                <li><a href="#mission" onClick={(e) => smoothScroll(e, 'mission')} className={linkClass}>Mission</a></li>
                <li><a href="#training" onClick={(e) => smoothScroll(e, 'training')} className={linkClass}>Training</a></li>
                <li><a href="#schedule" onClick={(e) => smoothScroll(e, 'schedule')} className={linkClass}>Schedule</a></li>
                <li><a href="#who-we-are" onClick={(e) => smoothScroll(e, 'who-we-are')} className={linkClass}>Who we are</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-mint">Get involved</h3>
              <ul className="mt-5 space-y-3">
                <li><button onClick={onApplyClick} className={linkClass}>Apply</button></li>
                <li><a href="#newsletter" onClick={(e) => smoothScroll(e, 'newsletter')} className={linkClass}>Get updates</a></li>
                <li><button onClick={onContactClick} className={linkClass}>Contact us</button></li>
              </ul>
            </div>
          </nav>

          <div className="md:col-span-3">
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-mint">Follow</h3>
            <div className="mt-5 flex gap-3">
              <a href="https://www.instagram.com/organizesouthdakota/" target="_blank" rel="noopener noreferrer" aria-label="Organize SD on Instagram" className="grid place-items-center w-11 h-11 rounded-full bg-white/10 hover:bg-white hover:text-brand-ink transition-colors">
                <i className="fab fa-instagram text-lg" aria-hidden="true"></i>
              </a>
              <a href="https://www.tiktok.com/@organizesouthdakota" target="_blank" rel="noopener noreferrer" aria-label="Organize SD on TikTok" className="grid place-items-center w-11 h-11 rounded-full bg-white/10 hover:bg-white hover:text-brand-ink transition-colors">
                <i className="fab fa-tiktok text-lg" aria-hidden="true"></i>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-16 rounded-2xl ring-1 ring-white/20 p-6 text-center text-xs leading-relaxed space-y-2">
          <p className="font-bold uppercase tracking-[0.15em]">Paid for by Organize SD</p>
          <p className="text-white/60">Organize SD is a Section 527 political organization.</p>
          <p className="text-white/60">
            Not authorized by any candidate or candidate's committee. Contributions are not tax-deductible.
            Organize SD follows strict independence standards to avoid coordination with candidates or committees.
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-between gap-3 text-xs text-white/50">
          <p>© {new Date().getFullYear()} Organize SD Inc. All rights reserved.</p>
          <button onClick={onPrivacyClick} className="text-left underline hover:text-white">Privacy Policy</button>
        </div>
      </div>
    </footer>
  );
};
