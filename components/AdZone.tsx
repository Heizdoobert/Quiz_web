import React from 'react';
import { Zap, Rocket } from 'lucide-react';
import StickyBannerAd from './StickyBannerAd';

interface AdZoneProps {
  variant: 'skyscraper' | 'banner' | 'sticky-bottom';
  slot: string;
  className?: string;
  children?: React.ReactNode;
}

export default function AdZone({ variant, slot, className = '', children }: AdZoneProps) {
  if (variant === 'sticky-bottom') {
    return <StickyBannerAd />;
  }

  if (variant === 'skyscraper') {
    return (
      <aside
        data-slot={slot}
        className={`hidden xl:flex flex-col w-[160px] shrink-0 sticky top-20 self-start p-3 rounded-2xl bg-[#1A1B35]/90 border border-[#2D305A] shadow-xl text-center backdrop-blur-sm transition-all hover:border-[#6C5CE7]/60 ${className}`}
        aria-label="Sponsored Promotions"
      >
        <div className="text-[10px] font-bold font-heading uppercase tracking-wider text-slate-400 mb-2 py-0.5 px-2 bg-[#0A1128]/80 rounded-full inline-block mx-auto border border-[#2D305A]">
          Sponsored
        </div>
        {children || (
          <div className="flex flex-col items-center justify-center min-h-[500px] border border-dashed border-[#2D305A] rounded-xl p-2 bg-[#0A1128]/40 text-slate-500 text-xs">
            <Zap className="w-6 h-6 text-[#FFD166] mb-2" />
            <span className="font-bold font-heading text-white">Hot Web3 Deals</span>
            <span className="text-[11px] text-slate-400 mt-1">Tools & Cloud Offers</span>
            <a
              href="https://www.profitableratecpmnetwork.com/pvr8jzwqk?key=7672ccaa0ae9cd3ce4f5fd168d596fde"
              target="_blank"
              rel="noopener sponsored"
              className="mt-4 px-3 py-1.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 text-[#0A1128] font-black font-heading rounded-lg text-[11px] shadow transition-all cursor-pointer"
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
      className={`w-full my-4 p-3 rounded-2xl bg-[#1A1B35]/90 border border-[#2D305A] shadow-md backdrop-blur-sm transition-all hover:border-[#6C5CE7]/60 ${className}`}
      aria-label="Sponsored Banner"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold font-heading uppercase tracking-wider text-slate-400 py-0.5 px-2 bg-[#0A1128]/80 rounded-full border border-[#2D305A]">
          Sponsored
        </span>
      </div>
      {children || (
        <a
          href="https://www.profitableratecpmnetwork.com/pvr8jzwqk?key=7672ccaa0ae9cd3ce4f5fd168d596fde"
          target="_blank"
          rel="noopener sponsored"
          className="flex items-center justify-between p-3.5 rounded-xl bg-[#0A1128]/70 hover:bg-[#25284D]/70 border border-[#2D305A]/70 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#00FFCC]/10 text-[#00FFCC] border border-[#00FFCC]/20 group-hover:scale-110 transition-transform">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white group-hover:text-[#00FFCC] transition-colors">
                Recommended Web3 Dev Tools & Cloud Infrastructure
              </p>
              <p className="text-xs text-slate-400">
                Explore curated developer resources, high-performance RPCs & exclusive discounts.
              </p>
            </div>
          </div>
          <span className="text-[#00FFCC] text-xs font-bold px-3 py-1.5 rounded-lg bg-[#00FFCC]/10 border border-[#00FFCC]/30 group-hover:bg-[#00FFCC] group-hover:text-[#0A1128] transition-all shrink-0 ml-4">
            Learn More →
          </span>
        </a>
      )}
    </section>
  );
}
