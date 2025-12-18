
import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { MissionStatement } from './components/MissionStatement';
import { Features } from './components/Features';
import { AboutSection } from './components/AboutSection';
import { DonationGrid } from './components/DonationGrid';
import { Footer } from './components/Footer';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main>
        <Hero />
        <MissionStatement />
        <Features />
        <AboutSection />
        <DonationGrid />
      </main>
      <Footer />
    </div>
  );
};

export default App;
