
import React, { useState } from 'react';

const StoryBlock: React.FC<{ 
    title: string; 
    text: string; 
    img: string; 
    reverse?: boolean; 
    cta: string;
    ctaLink?: string;
}> = ({ title, text, img, reverse, cta, ctaLink }) => (
    <div className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 items-center mb-16`}>
        <div className="w-full md:w-1/2">
            <img src={img} alt={title} className="w-full h-80 object-cover rounded-lg shadow-xl" />
        </div>
        <div className="w-full md:w-1/2 space-y-4">
            <h3 className="text-2xl font-bold text-[#311b92] uppercase tracking-wide">{title}</h3>
            <p className="text-gray-700 leading-relaxed text-lg">{text}</p>
            <a 
                href={ctaLink || "#"} 
                className="inline-block bg-[#311b92] text-white px-6 py-3 font-bold rounded hover:bg-teal-600 transition-colors uppercase text-sm tracking-widest"
            >
                {cta}
            </a>
        </div>
    </div>
);

export const Features: React.FC = () => {
  const [showAll, setShowAll] = useState(false);

  const scheduleItems = [
    { date: "Jan 23 - 25, 2026", location: "Rapid City", topic: "Inaugural Cohort", days: "Friday - Sunday" },
    { date: "Feb 20 - 22, 2026", location: "Sioux Falls", topic: "Second Cohort", days: "Friday - Sunday" },
    { date: "Mar 27 - 29, 2026", location: "TBA", topic: "Third Cohort", days: "Friday - Sunday" },
    { date: "Apr 17 - 19, 2026", location: "TBA", topic: "Fourth Cohort", days: "Friday - Sunday" },
    { date: "May 29 - 31, 2026", location: "TBA", topic: "Fifth Cohort", days: "Friday - Sunday" },
    { date: "Jun 19 - 21, 2026", location: "TBA", topic: "Sixth Cohort", days: "Friday - Sunday" },
    { date: "Jul 24 - 26, 2026", location: "Rapid City", topic: "Seventh Cohort", days: "Friday - Sunday" },
    { date: "Aug 7 - 9, 2026", location: "Sioux Falls", topic: "Eighth Cohort", days: "Friday - Sunday" },
  ];

  const visibleItems = showAll ? scheduleItems : scheduleItems.slice(0, 4);

  return (
    <section id="training" className="py-24 bg-white scroll-mt-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-20 text-center">
            <h2 className="text-3xl md:text-4xl font-black text-[#311b92] mb-4 uppercase tracking-tighter">What We Do: Operative Training</h2>
            <div className="w-24 h-2 bg-teal-400 mx-auto"></div>
        </div>
        
        <StoryBlock 
            title="Grassroots Fundamentals"
            text="We run in-person trainings on field, volunteer, and community organizing. We teach operatives how to build sustainable programs that last; not just one-off events."
            img="https://images.unsplash.com/photo-1622675363311-3e1904dc1885?q=80&w=800&auto=format&fit=crop"
            cta="See training schedule"
            ctaLink="#schedule"
        />

        <StoryBlock 
            title="Best-Practice Playbooks"
            reverse
            text="Our curriculum covers building turf plans, universes, and contact goals. We provide specialized scripts and onboarding systems to convert conversations into action."
            img="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800&auto=format&fit=crop"
            cta="Explore our playbooks"
        />

        <StoryBlock 
            title="Coaching & Peer Support"
            text="Beyond training, we offer direct office hours for trainees and local leaders, providing templates for tracking and a peer network of South Dakota Democratic operatives to share learnings."
            img="https://images.unsplash.com/photo-1603202662706-62ead3176b8f?q=80&w=800&auto=format&fit=crop"
            cta="Join the network"
        />

        {/* Dedicated Schedule Section */}
        <div id="schedule" className="mt-24 bg-gray-50 rounded-2xl p-8 md:p-12 border border-gray-200 scroll-mt-24">
            <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                <div>
                    <h3 className="text-3xl font-black text-[#311b92] uppercase italic tracking-tighter">Upcoming Training Schedule</h3>
                    <p className="text-gray-600 font-medium italic">Intensive 3-day workshops (Friday, Saturday, & Sunday) held throughout the 2026 cycle.</p>
                    <p className="text-rose-600 font-bold text-xs uppercase tracking-widest mt-2">
                        * Dates are subject to change based on cohort size accommodations and venue availability.
                    </p>
                </div>
                <button className="bg-orange-400 text-[#311b92] px-8 py-3 font-black rounded uppercase tracking-widest hover:bg-orange-300 transition-all shadow-lg">
                    Join Pipeline
                </button>
            </div>

            <div className="space-y-4">
                {visibleItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-8 border-teal-400">
                        <div className="flex gap-6 items-center">
                            <div className="hidden md:block text-[#311b92] font-black text-lg w-44 leading-tight">
                                {item.date}<span className="text-rose-600 ml-0.5 text-xs align-top">*</span>
                                <div className="text-[10px] text-teal-600 uppercase tracking-tighter font-bold">{item.days}</div>
                            </div>
                            <div>
                                <h4 className="font-bold text-xl text-gray-900 leading-tight uppercase tracking-tight">{item.topic}</h4>
                                <div className="flex items-center gap-2 text-sm text-gray-500 font-semibold uppercase tracking-tighter mt-1">
                                    <i className="fas fa-map-marker-alt text-rose-500"></i>
                                    {item.location}
                                    <span className="md:hidden ml-2">• {item.date}<span className="text-rose-600 ml-0.5 text-[10px] align-top">*</span></span>
                                </div>
                            </div>
                        </div>
                        <button className="mt-4 md:mt-0 bg-[#311b92] text-white px-5 py-2 rounded font-bold uppercase text-xs hover:bg-teal-600 transition-all">
                            Details & RSVP <i className="fas fa-chevron-right ml-1"></i>
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-8 text-center">
                <button 
                  onClick={() => setShowAll(!showAll)}
                  className="inline-flex items-center gap-2 text-[#311b92] font-black uppercase tracking-widest hover:text-teal-600 transition-colors"
                >
                  {showAll ? 'Show Less' : 'See More Dates'} 
                  <i className={`fas fa-chevron-${showAll ? 'up' : 'down'} transition-transform`}></i>
                </button>
            </div>
        </div>
      </div>
    </section>
  );
};
