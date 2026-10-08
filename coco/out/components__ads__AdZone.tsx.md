# components/ads/AdZone.tsx
lines:118 exports:default
---
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
