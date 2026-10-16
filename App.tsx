
import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { WhoAreWe } from './components/WhoAreWe';
import { MissionStatement } from './components/MissionStatement';
import { Features } from './components/Features';
import { HowItWorks } from './components/HowItWorks';
import { AboutSection } from './components/AboutSection';
import { DonationGrid } from './components/DonationGrid';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { StickyOptIn } from './components/StickyOptIn';
import { ContactDialog } from './components/ContactDialog';
import { DonateDialog } from './components/DonateDialog';
import { PrivacyPage } from './components/PrivacyPage';
import { ApplyForm } from './components/ApplyForm';

/* ─── Lightweight History-based Router ─── */
type AppView = 'home' | 'privacy' | 'apply';

const pathToView = (pathname: string): AppView => {
  switch (pathname) {
    case '/apply': return 'apply';
    case '/privacy': return 'privacy';
    default: return 'home';
  }
};

const viewToPath = (view: AppView): string => {
  switch (view) {
    case 'apply': return '/apply';
    case 'privacy': return '/privacy';
    default: return '/';
  }
};

const App: React.FC = () => {
  const [view, setViewState] = useState<AppView>(() => pathToView(window.location.pathname));
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isDonateDialogOpen, setIsDonateDialogOpen] = useState(false);

  /** Navigate to a view and update the URL */
  const navigateTo = useCallback((target: AppView) => {
    const path = viewToPath(target);
    if (window.location.pathname !== path) {
      window.history.pushState({ view: target }, '', path);
    }
    setViewState(target);
  }, []);

  /** Handle browser back/forward buttons */
  useEffect(() => {
    const handlePopState = () => {
      setViewState(pathToView(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const closeDonateDialog = useCallback(() => setIsDonateDialogOpen(false), []);
  const closeContact = useCallback(() => setIsContactOpen(false), []);

  useEffect(() => {
    // Show the donate dialog once per session, after the reader has seen the mission and program
    // (60% of the page scrolled) or spent 45 seconds on the home view
    if (view !== 'home') return;
    try { if (sessionStorage.getItem('osd-donate-shown') === '1') return; } catch { /* storage unavailable */ }

    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      try { sessionStorage.setItem('osd-donate-shown', '1'); } catch { /* storage unavailable */ }
      setIsDonateDialogOpen(true);
      cleanup();
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max > 0.6) show();
    };
    const timer = setTimeout(show, 45000);
    window.addEventListener('scroll', onScroll, { passive: true });
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
    return cleanup;
  }, [view]);

  useEffect(() => {
    // Scroll to top when view changes
    window.scrollTo(0, 0);
  }, [view]);

  return (
    <div className="min-h-screen flex flex-col">
      {view !== 'apply' && <Navbar onHomeClick={() => navigateTo('home')} onApplyClick={() => navigateTo('apply')} />}
      <main className="flex-grow">
        {view === 'home' ? (
          <>
            <Hero onApplyClick={() => navigateTo('apply')} />
            <MissionStatement />
            <Features />
            <AboutSection />
            <HowItWorks onApplyClick={() => navigateTo('apply')} />
            <WhoAreWe />
            <DonationGrid />
            <ContactSection />
            <StickyOptIn />
          </>
        ) : view === 'apply' ? (
          <ApplyForm onBack={() => navigateTo('home')} />
        ) : (
          <PrivacyPage onBack={() => navigateTo('home')} />
        )}
      </main>
      {view !== 'apply' && (
        <Footer
          onContactClick={() => setIsContactOpen(true)}
          onPrivacyClick={() => navigateTo('privacy')}
          onHomeClick={() => navigateTo('home')}
          onApplyClick={() => navigateTo('apply')}
        />
      )}
      {view !== 'apply' && <ScrollToTop />}

      {/* Modals */}
      <ContactDialog isOpen={isContactOpen} onClose={closeContact} />
      {view !== 'apply' && <DonateDialog isOpen={isDonateDialogOpen} onClose={closeDonateDialog} />}
    </div>
  );
};

export default App;
