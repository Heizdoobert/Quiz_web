# components/ads/AdZone.tsx
lines:102 exports:default
---
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
