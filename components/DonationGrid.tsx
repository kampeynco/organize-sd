
import React from 'react';

const donate = (amount?: number) => {
    let url = 'https://secure.actblue.com/donate/organize-sd?refcode=webgrid';
    if (amount) url += `&amount=${amount}`;
    window.open(url, '_blank', 'noopener,noreferrer');
};

const AMOUNTS: { amount: number; impact?: string }[] = [
    { amount: 10 },
    { amount: 25, impact: 'Training materials' },
    { amount: 50 },
    { amount: 100, impact: 'Travel support' },
    { amount: 250 },
    { amount: 500, impact: 'Sponsors a trainee weekend' },
];

export const DonationGrid: React.FC = () => {
    return (
        <section id="donate" className="grain relative isolate overflow-hidden bg-brand text-white py-24 md:py-32 scroll-mt-20">
            <div className="absolute -z-10 top-0 right-0 w-[36rem] h-[36rem] rounded-full bg-signal/20 blur-[140px]" aria-hidden="true"></div>
            <div className="container mx-auto px-5 max-w-6xl grid lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-5">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-mint">Support the training</p>
                    <h2 className="mt-4 font-display font-black uppercase text-5xl md:text-7xl leading-[0.9]">
                        Fund the next organizer
                    </h2>
                    <p className="mt-6 text-lg text-white/80 leading-relaxed">
                        Your contribution puts trained organizers in South Dakota communities ahead of November 2028.
                    </p>
                    <p className="mt-6 text-sm text-white/55">
                        Processed securely by ActBlue. Contributions are not tax-deductible.
                    </p>
                </div>

                <div className="lg:col-span-7">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {AMOUNTS.map(({ amount, impact }) => (
                            <button
                                key={amount}
                                onClick={() => donate(amount)}
                                className="group flex flex-col items-start justify-between min-h-[8.5rem] rounded-2xl bg-white/[0.07] ring-1 ring-inset ring-white/15 p-5 text-left hover:bg-signal hover:ring-signal hover:text-brand-ink transition-colors"
                            >
                                <span className="font-display font-black text-5xl leading-none">${amount}</span>
                                {impact && (
                                    <span className="mt-3 text-sm font-semibold text-white/70 group-hover:text-brand-ink/80">{impact}</span>
                                )}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => donate()}
                        className="mt-3 w-full rounded-2xl bg-white py-5 font-bold text-lg text-brand hover:bg-paper transition-colors"
                    >
                        Give another amount <i className="fas fa-arrow-up-right-from-square ml-2 text-sm" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        </section>
    );
};
