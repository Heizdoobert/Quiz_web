"use client";
import { logger } from "@/lib/logger";

import React, { useEffect, useState } from "react";
import { Zap, Rocket, Shield } from "lucide-react";
import StickyBannerAd from "./StickyBannerAd";
import { fetchRandomSponsor, Sponsor } from "@/lib/actions/ads-actions";

interface AdZoneProps {
  variant: "skyscraper" | "banner" | "sticky-bottom";
  slot: string;
  className?: string;
  children?: React.ReactNode;
}

export default function AdZone({
  variant,
  slot,
  className = "",
  children,
}: AdZoneProps) {
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);

  useEffect(() => {
    if (variant === "sticky-bottom") return;
    fetchRandomSponsor()
      .then((data) => {
        if (data) setSponsor(data);
      })
      .catch((err) => logger.error('error', err));
  }, [variant]);

  if (variant === "sticky-bottom") {
    return <StickyBannerAd />;
  }

  // Mapping string icon to Lucide component
  let IconComponent = Zap;
  if (sponsor?.icon === "Rocket") IconComponent = Rocket;
  if (sponsor?.icon === "Shield") IconComponent = Shield;

  if (variant === "skyscraper") {
    return (
      <aside
        data-slot={slot}
        className={`hidden xl:flex flex-col w-40 shrink-0 sticky top-20 self-start p-4 rounded-2xl glass glass-border border border-transparent shadow-xl text-center transition-all hover:border-electric-indigo/60 ${className}`}
        aria-label="Sponsored Promotions"
      >
        <div className="text-[10px] font-bold font-heading uppercase tracking-wider text-slate-400 mb-2 py-0.5 px-2 bg-deep-space/80 rounded-full inline-block mx-auto border border-cyber-border">
          Sponsored
        </div>
        {children || (
          <div className="flex flex-col items-center justify-center min-h-125 border border-dashed border-cyber-border rounded-xl p-2 bg-deep-space/40 text-slate-500 text-xs">
            <IconComponent className="w-6 h-6 text-crypto-gold mb-2" />
            <span className="font-bold font-heading text-white">
              {sponsor ? sponsor.name : "Hot Deals"}
            </span>
            <span className="text-[11px] text-slate-400 mt-1">
              {sponsor ? sponsor.category : "Tools & Cloud Offers"}
            </span>
            <a
              href={sponsor ? sponsor.url : "https://go.isclix.com"}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="mt-4 px-3 py-1.5 bg-linear-to-r from-neo-mint to-electric-indigo hover:opacity-95 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint text-deep-space font-black font-heading rounded-lg text-[11px] shadow transition-all cursor-pointer"
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
      className={`w-full my-4 p-4 rounded-2xl glass glass-border border border-transparent shadow-md transition-all hover:border-electric-indigo/60 ${className}`}
      aria-label="Sponsored Banner"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold font-heading uppercase tracking-wider text-slate-400 py-0.5 px-2 bg-deep-space/80 rounded-full border border-cyber-border">
          Sponsored
        </span>
      </div>
      {children || (
        <a
          href={sponsor ? sponsor.url : "https://shorten.asia"}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="flex items-center justify-between p-3.5 rounded-xl bg-deep-space/70 hover:bg-cyber-violet-light/70 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint border border-cyber-border/70 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neo-mint/10 text-neo-mint border border-neo-mint/20 group-hover:scale-110 transition-transform">
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white group-hover:text-neo-mint transition-colors">
                {sponsor
                  ? sponsor.name
                  : "Recommended Tools & Cloud Infrastructure"}
              </p>
              <p className="text-xs text-slate-400">
                {sponsor
                  ? sponsor.description
                  : "Explore curated developer resources, high-performance RPCs & exclusive discounts."}
              </p>
            </div>
          </div>
          <span className="text-neo-mint text-xs font-bold px-3 py-1.5 rounded-lg bg-neo-mint/10 border border-neo-mint/30 group-hover:bg-neo-mint group-hover:text-deep-space transition-all shrink-0 ml-4">
            Learn More →
          </span>
        </a>
      )}
    </section>
  );
}
