'use client';

import React, { useEffect, useState } from 'react';
import { Zap, Rocket, Shield } from 'lucide-react';
import StickyBannerAd from './StickyBannerAd';
import { fetchRandomSponsor, Sponsor } from '@/lib/actions/ads-actions';

interface AdZoneProps {
  variant: 'skyscraper' | 'banner' | 'sticky-bottom';
  slot: string;
  className?: string;
  children?: React.ReactNode;
}

export default function AdZone({ variant, slot, className = '', children }: AdZoneProps) {
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);

  useEffect(() => {
    if (variant === 'sticky-bottom') return;
    fetchRandomSponsor().then(data => {
      if (data) setSponsor(data);
    }).catch(console.error);
  }, [variant]);

  if (variant === 'sticky-bottom') {
    return <StickyBannerAd />;
  }

  // Mapping string icon to Lucide component
  let IconComponent = Zap;
  if (sponsor?.icon === 'Rocket') IconComponent = Rocket;
  if (sponsor?.icon === 'Shield') IconComponent = Shield;

  if (variant === 'skyscraper') {
    return (
      <aside
        data-slot={slot}
        className={`hidden xl:flex flex-col w-[160px] shrink-0 sticky top-20 self-start p-4 rounded-2xl glass glass-border border border-transparent shadow-xl text-center transition-all hover:border-[#6C5CE7]/60 ${className}`}
        aria-label="Sponsored Promotions"
      >
        <div className="text-[10px] font-bold font-heading uppercase tracking-wider text-slate-400 mb-2 py-0.5 px-2 bg-[#0A1128]/80 rounded-full inline-block mx-auto border border-[#2D305A]">
          Sponsored
        </div>
        {children || (
          <div className="flex flex-col items-center justify-center min-h-[500px] border border-dashed border-[#2D305A] rounded-xl p-2 bg-[#0A1128]/40 text-slate-500 text-xs">
            <IconComponent className="w-6 h-6 text-[#FFD166] mb-2" />
            <span className="font-bold font-heading text-white">{sponsor ? sponsor.name : 'Hot Web3 Deals'}</span>
            <span className="text-[11px] text-slate-400 mt-1">{sponsor ? sponsor.category : 'Tools & Cloud Offers'}</span>
            <a
              href={sponsor ? sponsor.url : 'https://go.isclix.com'}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="mt-4 px-3 py-1.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] text-[#0A1128] font-black font-heading rounded-lg text-[11px] shadow transition-all cursor-pointer"
            >
              Claim Offer →
            </a>
          </div>
        )}
      </aside>
    );
  }

  // Horizontal Banner
  return (
    <section
      data-slot={slot}
      className={`w-full my-4 p-4 rounded-2xl glass glass-border border border-transparent shadow-md transition-all hover:border-[#6C5CE7]/60 ${className}`}
      aria-label="Sponsored Banner"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold font-heading uppercase tracking-wider text-slate-400 py-0.5 px-2 bg-[#0A1128]/80 rounded-full border border-[#2D305A]">
          Sponsored
        </span>
      </div>
      {children || (
        <a
          href={sponsor ? sponsor.url : 'https://shorten.asia'}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="flex items-center justify-between p-3.5 rounded-xl bg-[#0A1128]/70 hover:bg-[#25284D]/70 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] border border-[#2D305A]/70 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#00FFCC]/10 text-[#00FFCC] border border-[#00FFCC]/20 group-hover:scale-110 transition-transform">
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white group-hover:text-[#00FFCC] transition-colors">
                {sponsor ? sponsor.name : 'Recommended Web3 Dev Tools & Cloud Infrastructure'}
              </p>
              <p className="text-xs text-slate-400">
                {sponsor ? sponsor.description : 'Explore curated developer resources, high-performance RPCs & exclusive discounts.'}
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
