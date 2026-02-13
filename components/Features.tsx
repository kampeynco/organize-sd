
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
    const [activeDay, setActiveDay] = useState<'friday' | 'saturday' | 'sunday'>('friday');

    const schedule = {
        friday: {
            label: 'Friday',
            icon: 'fa-flag',
            tagline: 'Arrival & Foundations',
            items: [
                { time: '3:00 – 5:00 PM', title: 'Check In', icon: 'fa-clipboard-check' },
                { time: '5:00 – 6:00 PM', title: 'Welcome & Introductions', icon: 'fa-handshake' },
                { time: '6:00 – 6:30 PM', title: 'Itinerary Review', icon: 'fa-list-check' },
                { time: '6:30 – 7:30 PM', title: 'Dinner', icon: 'fa-utensils' },
                { time: '7:30 – 9:00 PM', title: 'What is Organizing?', icon: 'fa-bullhorn' },
            ],
        },
        saturday: {
            label: 'Saturday',
            icon: 'fa-hammer',
            tagline: 'Skills & Simulations',
            items: [
                { time: '8:00 – 9:00 AM', title: 'Check In / Light Breakfast', icon: 'fa-mug-hot' },
                { time: '9:00 – 9:30 AM', title: 'Welcome / Itinerary Review', icon: 'fa-list-check' },
                { time: '9:30 – 11:00 AM', title: 'Fundamentals of Field', icon: 'fa-map' },
                { time: '11:00 AM – 1:00 PM', title: 'Lunch', icon: 'fa-utensils' },
                { time: '1:00 – 2:30 PM', title: 'Basics of VAN', icon: 'fa-database' },
                { time: '2:30 – 3:30 PM', title: 'Tech in Organizing', icon: 'fa-laptop' },
                { time: '3:30 – 5:00 PM', title: 'Field Simulations', icon: 'fa-people-group' },
                { time: '5:00 – 7:00 PM', title: 'Q&A', icon: 'fa-comments' },
            ],
        },
        sunday: {
            label: 'Sunday',
            icon: 'fa-trophy',
            tagline: 'Strategy & Next Steps',
            items: [
                { time: '8:00 – 9:00 AM', title: 'Check In / Light Breakfast', icon: 'fa-mug-hot' },
                { time: '9:00 – 9:30 AM', title: 'Welcome / Itinerary Review', icon: 'fa-list-check' },
                { time: '9:30 – 11:00 AM', title: 'Coalition Building 101', icon: 'fa-users' },
                { time: '11:00 AM – 1:00 PM', title: 'Lunch', icon: 'fa-utensils' },
                { time: '1:00 – 3:00 PM', title: 'Basics of Grassroots Fundraising', icon: 'fa-hand-holding-dollar' },
                { time: '3:00 – 5:00 PM', title: 'Organizing Meet & Greets / Impact Events', icon: 'fa-calendar-check' },
            ],
        },
    };

    const days = ['friday', 'saturday', 'sunday'] as const;
    const currentSchedule = schedule[activeDay];

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

                {/* Weekend Schedule Section */}
                <div id="schedule" className="mt-24 bg-gray-50 rounded-2xl p-8 md:p-12 border border-gray-200 scroll-mt-24">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
                        <div>
                            <h3 className="text-3xl font-black text-[#311b92] uppercase italic tracking-tighter">Weekend Intensive Schedule</h3>
                            <p className="text-gray-600 font-medium italic mt-1">A look inside our 3-day immersive training weekend.</p>
                        </div>
                        <button className="bg-orange-400 text-[#311b92] px-8 py-3 font-black rounded uppercase tracking-widest hover:bg-orange-300 transition-all shadow-lg whitespace-nowrap">
                            Join Pipeline
                        </button>
                    </div>

                    {/* Day Tabs */}
                    <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                        {days.map((day) => {
                            const isActive = activeDay === day;
                            const dayData = schedule[day];
                            return (
                                <button
                                    key={day}
                                    onClick={() => setActiveDay(day)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-sm tracking-wider transition-all whitespace-nowrap ${isActive
                                            ? 'bg-[#311b92] text-white shadow-lg'
                                            : 'bg-white text-[#311b92] border-2 border-gray-200 hover:border-[#311b92]/30'
                                        }`}
                                >
                                    <i className={`fas ${dayData.icon} ${isActive ? 'text-teal-400' : ''}`}></i>
                                    {dayData.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Day Tagline */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-teal-400 rounded-lg flex items-center justify-center">
                            <i className={`fas ${currentSchedule.icon} text-[#311b92] text-sm`}></i>
                        </div>
                        <div>
                            <p className="text-[#311b92] font-black text-lg uppercase tracking-tight">{currentSchedule.label}</p>
                            <p className="text-gray-500 text-sm font-bold italic">{currentSchedule.tagline}</p>
                        </div>
                    </div>

                    {/* Schedule Items */}
                    <div className="space-y-3">
                        {currentSchedule.items.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-4 md:gap-6 p-4 md:p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-teal-400 group"
                            >
                                <div className="w-10 h-10 bg-[#311b92]/5 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-teal-400/10 transition-colors">
                                    <i className={`fas ${item.icon} text-[#311b92] text-sm`}></i>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-1 sm:gap-4">
                                    <h4 className="font-bold text-gray-900 text-base md:text-lg">{item.title}</h4>
                                    <span className="text-[#311b92] font-black text-sm whitespace-nowrap tracking-tight">{item.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* End-of-day marker */}
                    <div className="mt-6 flex items-center gap-3">
                        <div className="flex-grow h-px bg-gray-200"></div>
                        <span className="text-gray-400 text-xs font-black uppercase tracking-widest">
                            {activeDay === 'sunday' ? '🎉 Ending Statements' : `End of ${currentSchedule.label}`}
                        </span>
                        <div className="flex-grow h-px bg-gray-200"></div>
                    </div>
                </div>
            </div>
        </section>
    );
};
