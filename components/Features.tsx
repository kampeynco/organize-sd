
import React from 'react';

const StoryBlock: React.FC<{ 
    title: string; 
    text: string; 
    img: string; 
    reverse?: boolean; 
    cta: string 
}> = ({ title, text, img, reverse, cta }) => (
    <div className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 items-center mb-16`}>
        <div className="w-full md:w-1/2">
            <img src={img} alt={title} className="w-full h-80 object-cover rounded-lg shadow-xl" />
        </div>
        <div className="w-full md:w-1/2 space-y-4">
            <h3 className="text-2xl font-bold text-[#311b92] uppercase tracking-wide">{title}</h3>
            <p className="text-gray-700 leading-relaxed text-lg">{text}</p>
            <button className="bg-[#311b92] text-white px-6 py-3 font-bold rounded hover:bg-teal-600 transition-colors uppercase text-sm tracking-widest">
                {cta}
            </button>
        </div>
    </div>
);

export const Features: React.FC = () => {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-20 text-center">
            <h2 className="text-3xl md:text-4xl font-black text-[#311b92] mb-4 uppercase tracking-tighter">What We Do: Operative Training</h2>
            <div className="w-24 h-2 bg-teal-400 mx-auto"></div>
        </div>
        
        <StoryBlock 
            title="Grassroots Fundamentals"
            text="We run live and virtual trainings on field, volunteer, and community organizing. We teach operatives how to build sustainable programs that last—not just one-off events."
            img="https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=800&auto=format&fit=crop"
            cta="See training schedule"
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
            img="https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=800&auto=format&fit=crop"
            cta="Join the network"
        />
      </div>
    </section>
  );
};
