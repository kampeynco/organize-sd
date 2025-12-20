
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { WhoAreWe } from './components/WhoAreWe';
import { MissionStatement } from './components/MissionStatement';
import { Features } from './components/Features';
import { AboutSection } from './components/AboutSection';
import { DonationGrid } from './components/DonationGrid';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { StickyOptIn } from './components/StickyOptIn';
import { ContactDialog } from './components/ContactDialog';
import { DonateDialog } from './components/DonateDialog';
import { PrivacyPage } from './components/PrivacyPage';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'privacy'>('home');
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isDonateDialogOpen, setIsDonateDialogOpen] = useState(false);

  useEffect(() => {
    // Show donate dialog after 7 seconds, only on home view
    if (view === 'home') {
      const timer = setTimeout(() => {
        setIsDonateDialogOpen(true);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  useEffect(() => {
    // Scroll to top when view changes
    window.scrollTo(0, 0);
  }, [view]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onHomeClick={() => setView('home')} />
      <main className="flex-grow">
        {view === 'home' ? (
          <>
            <Hero />
            <WhoAreWe />
            <MissionStatement />
            <Features />
            <AboutSection />
            <DonationGrid />
            <ContactSection />
            <StickyOptIn />
          </>
        ) : (
          <PrivacyPage onBack={() => setView('home')} />
        )}
      </main>
      <Footer 
        onContactClick={() => setIsContactOpen(true)} 
        onPrivacyClick={() => setView('privacy')}
        onHomeClick={() => setView('home')}
      />
      <ScrollToTop />
      
      {/* Modals */}
      <ContactDialog isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
      <DonateDialog isOpen={isDonateDialogOpen} onClose={() => setIsDonateDialogOpen(false)} />
    </div>
  );
};

export default App;
