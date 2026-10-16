
import React, { useEffect, useRef, useState } from 'react';

interface DonateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const AMOUNTS: { amount: number; impact?: string }[] = [
  { amount: 25, impact: 'Training materials' },
  { amount: 50 },
  { amount: 100, impact: 'Travel support' },
  { amount: 250 },
  { amount: 500, impact: 'A trainee weekend' },
  { amount: 1000 },
];

export const DonateDialog: React.FC<DonateDialogProps> = ({ isOpen, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
      return;
    }
    const timer = setTimeout(() => setIsVisible(true), 10);
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const handleDonate = (amount?: number) => {
    let url = 'https://secure.actblue.com/donate/organize-sd?refcode=webpop';
    if (amount) url += `&amount=${amount}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-brand-ink/70 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="donate-title"
        className={`relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-brand text-white shadow-2xl grain isolate transition-transform duration-500 ${isVisible ? 'translate-y-0 scale-100' : 'translate-y-10 sm:scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          onClick={onClose}
          className="absolute top-4 right-4 w-11 h-11 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Close"
        >
          <i className="fas fa-xmark text-lg" aria-hidden="true"></i>
        </button>

        <div className="p-7 sm:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-mint">Stand with Organize SD</p>
          <h2 id="donate-title" className="mt-3 font-display font-black uppercase text-4xl sm:text-5xl leading-[0.9] pr-10">
            Help train South Dakota's next organizers
          </h2>

          <div className="mt-8 grid grid-cols-3 gap-2.5">
            {AMOUNTS.map(({ amount, impact }) => (
              <button
                key={amount}
                onClick={() => handleDonate(amount)}
                className="group flex flex-col items-start justify-between min-h-[5.5rem] rounded-2xl bg-white/[0.08] ring-1 ring-inset ring-white/15 p-4 text-left hover:bg-signal hover:text-brand-ink transition-colors"
              >
                <span className="font-display font-black text-2xl sm:text-3xl leading-none">${amount.toLocaleString()}</span>
                {impact && <span className="mt-2 text-xs font-semibold text-white/65 group-hover:text-brand-ink/80">{impact}</span>}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleDonate()}
            className="mt-2.5 w-full rounded-2xl bg-white py-4 font-bold text-brand hover:bg-paper transition-colors"
          >
            Other amount
          </button>

          <p className="mt-5 text-xs text-white/60 leading-relaxed">
            If you've saved your payment information with ActBlue Express, your donation will go through immediately.
          </p>
        </div>
      </div>
    </div>
  );
};
