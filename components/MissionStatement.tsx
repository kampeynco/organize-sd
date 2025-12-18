
import React from "react";

export const MissionStatement: React.FC = () => {
  return (
    <section className="bg-[#4a148c] py-20 text-white">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* pre-headline */}
        <p className="text-sm md:text-base font-bold tracking-widest uppercase opacity-80 mb-4">
          Our mission
        </p>

        {/* headline */}
        <h2 className="text-3xl md:text-5xl font-black mb-8 leading-tight">
          Training a new generation of South Dakota organizers.
        </h2>

        {/* description */}
        <div className="text-lg md:text-xl font-medium opacity-80 leading-relaxed space-y-6">
          <p>
            Organize SD is a South Dakota-based training initiative that strengthens the Democratic ecosystem by developing high-skill grassroots operatives who can build and run effective organizing programs across federal, state, and local races.
          </p>
          <p className="border-l-4 border-teal-400 pl-6 italic">
            "We train local teams to scale voter contact, volunteer power, and turnout using movement-building best practices."
          </p>
        </div>
      </div>
    </section>
  );
};
