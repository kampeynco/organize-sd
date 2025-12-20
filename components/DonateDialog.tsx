
import React, { useEffect, useState } from 'react';

interface DonateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonateDialog: React.FC<DonateDialogProps> = ({ isOpen, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Small delay for animation trigger
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const amounts = ['$ 10', '$ 25', '$ 50', '$ 100', '$ 250'];

  return (
    <div 
      className={`fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div 
        className={`bg-[#e52d27] w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden relative transition-transform duration-500 transform ${isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-10'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors text-3xl z-20"
          aria-label="Close"
        >
          <i className="fas fa-times"></i>
        </button>

        <div className="p-8 md:p-12 flex flex-col items-center text-center text-white">
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
            Stand with Organize SD!
          </h2>
          
          <p className="text-lg md:text-xl font-medium mb-10 leading-relaxed max-w-xl">
            As we fight to build grassroots power and develop the next generation of organizers. 
            It's going to take all of us getting involved to win in South Dakota and build a permanent 
            Democratic infrastructure for 2026.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mb-8">
            {amounts.map((amount) => (
              <button 
                key={amount}
                className="bg-[#1a233a] hover:bg-[#252f4a] text-white py-6 rounded-md font-black text-4xl transition-all active:scale-95"
              >
                {amount}
              </button>
            ))}
            <button 
              className="border-2 border-white hover:bg-white hover:text-[#e52d27] text-white py-6 rounded-md font-black text-4xl transition-all active:scale-95"
            >
              Other
            </button>
          </div>

          <p className="text-xs font-semibold opacity-90 max-w-md">
            If you've saved your payment information with ActBlue Express, your donation will go through immediately.
          </p>
        </div>
      </div>
    </div>
  );
};
