
import React, { useState } from 'react';
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

const App: React.FC = () => {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main>
        <Hero />
        <WhoAreWe />
        <MissionStatement />
        <Features />
        <AboutSection />
        <DonationGrid />
        <ContactSection />
      </main>
      <Footer onContactClick={() => setIsContactOpen(true)} />
      <ScrollToTop />
      <StickyOptIn />
      <ContactDialog isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </div>
  );
};

export default App;
