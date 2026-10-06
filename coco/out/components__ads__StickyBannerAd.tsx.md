# components/ads/StickyBannerAd.tsx
lines:112 exports:default
---
"use client";

import React, { useState } from "react";
import { X, ExternalLink, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StickyBannerAdProps {
  position?: "bottom" | "top";
  onDismiss?: () => void;
  title?: string;
  sponsor?: string;
  ctaText?: string;
  href?: string;
}

export default function StickyBannerAd({
  position = "bottom",
  onDismiss,
  title = "Web3 Cloud & High-Speed Dev RPCs • Claim 20% Extra Credits",
  sponsor = "RPC NodeX",
  ctaText = "Claim Deal",
  // gitleaks:allow
  href = "https://www.profitableratecpmnetwork.com/pvr8jzwqk?key=REDACTED",
}: StickyBannerAdProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  const isBottom = position === "bottom";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
