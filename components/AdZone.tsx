import React from 'react';

interface AdZoneProps {
  variant: 'skyscraper' | 'banner';
  slot: string;
  className?: string;
  children?: React.ReactNode;
}

export default function AdZone({ variant, slot, className = '', children }: AdZoneProps) {
  if (variant === 'skyscraper') {
    return (
      <aside
        data-slot={slot}
        className={`hidden xl:flex flex-col w-[160px] shrink-0 sticky top-20 self-start p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-lg text-center backdrop-blur-sm transition-all hover:border-slate-600 ${className}`}
        aria-label="Sponsored Promotions"
      >
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 py-0.5 px-2 bg-slate-900/60 rounded-full inline-block mx-auto border border-slate-700/40">
          Sponsored
        </div>
        {children || (
          <div className="flex flex-col items-center justify-center min-h-[500px] border border-dashed border-slate-700 rounded-lg p-2 text-slate-500 text-xs">
            <span className="text-2xl mb-2">⚡</span>
            <span className="font-medium text-slate-300">Hot Dev Deals</span>
            <span className="text-[11px] text-slate-400 mt-1">Tools & Cloud Offers</span>
            <a
              href="https://www.profitableratecpmnetwork.com/pvr8jzwqk?key=7672ccaa0ae9cd3ce4f5fd168d596fde"
              target="_blank"
              rel="noopener sponsored"
              className="mt-4 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[11px] font-medium transition-colors"
            >
              Claim Offer →
            </a>
          </div>
        )}
      </aside>
    );
  }

  // Horizontal Banner (fits any width, mobile to desktop)
  return (
    <section
      data-slot={slot}
      className={`w-full my-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-md backdrop-blur-sm transition-all hover:border-slate-600 ${className}`}
      aria-label="Sponsored Banner"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-0.5 px-2 bg-slate-900/60 rounded-full border border-slate-700/40">
          Sponsored
        </span>
      </div>
      {children || (
        <a
          href="https://www.profitableratecpmnetwork.com/pvr8jzwqk?key=7672ccaa0ae9cd3ce4f5fd168d596fde"
          target="_blank"
          rel="noopener sponsored"
          className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900/80 border border-slate-700/40 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl group-hover:scale-110 transition-transform">🚀</span>
            <div>
              <p className="text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                Recommended Dev Tools & Cloud Infrastructure
              </p>
              <p className="text-xs text-slate-400">
                Explore curated developer resources, high-performance hosting & exclusive discounts.
              </p>
            </div>
          </div>
          <span className="text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-600/20 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0 ml-4">
            Learn More →
          </span>
        </a>
      )}
    </section>
  );
}
