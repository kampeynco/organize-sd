
import React from 'react';

export const Footer: React.FC = () => {
  const smoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-[#311b92] text-white pt-20 pb-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center mb-12">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-black tracking-widest uppercase">ORGANIZE SD</h2>
            </div>
            
            <div className="flex gap-6 text-3xl mb-12">
                <a href="#" className="hover:text-teal-400"><i className="fab fa-tiktok"></i></a>
                <a href="#" className="hover:text-teal-400"><i className="fab fa-instagram"></i></a>
                <a href="#" className="hover:text-teal-400"><i className="fab fa-facebook"></i></a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-5xl text-center md:text-left border-t border-white/10 pt-12">
                <div>
                    <h3 className="font-bold uppercase tracking-widest text-teal-400 mb-6">Get Involved</h3>
                    <ul className="space-y-3 font-semibold text-sm">
                        <li><a href="#training" onClick={(e) => smoothScroll(e, 'training')} className="hover:underline">Apply for Training</a></li>
                        <li><a href="#donate" onClick={(e) => smoothScroll(e, 'donate')} className="hover:underline">Donate</a></li>
                        <li><a href="#contact" onClick={(e) => smoothScroll(e, 'contact')} className="hover:underline">Become a Trainer</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold uppercase tracking-widest text-teal-400 mb-6">Initiative</h3>
                    <ul className="space-y-3 font-semibold text-sm">
                        <li><a href="#mission" onClick={(e) => smoothScroll(e, 'mission')} className="hover:underline">About Organize SD</a></li>
                        <li><a href="#contact" onClick={(e) => smoothScroll(e, 'contact')} className="hover:underline">Contact Us</a></li>
                    </ul>
                </div>
            </div>
        </div>

        <div className="max-w-4xl mx-auto border-2 border-white/30 p-6 text-center space-y-4 text-xs font-bold leading-relaxed">
            <div className="uppercase tracking-widest">PAID FOR BY ORGANIZE SD </div>
            <div className="text-gray-400">Organize SD is a 527 political organization.</div>
            <div className="text-gray-400">Not authorized by any candidate or candidate’s committee. Contributions are not tax-deductible. <br/> Organize SD follows strict independence standards to avoid coordination with candidates or committees.</div>
        </div>

        <div className="mt-12 text-center text-[10px] text-gray-500">
            <p>Copyright 2024 Organize SD All rights reserved. <a href="#" className="underline">Privacy Policy</a></p>
        </div>
      </div>
    </footer>
  );
};
