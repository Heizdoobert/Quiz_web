'use client';

import React, { useState } from 'react';
import { X, ExternalLink, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StickyBannerAdProps {
  position?: 'bottom' | 'top';
  onDismiss?: () => void;
  title?: string;
  sponsor?: string;
  ctaText?: string;
  href?: string;
}

export default function StickyBannerAd({
  position = 'bottom',
  onDismiss,
  title = 'Web3 Cloud & High-Speed Dev RPCs • Claim 20% Extra Credits',
  sponsor = 'RPC NodeX',
  ctaText = 'Claim Deal',
  href = 'https://www.profitableratecpmnetwork.com/pvr8jzwqk?key=7672ccaa0ae9cd3ce4f5fd168d596fde',
}: StickyBannerAdProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  const isBottom = position === 'bottom';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          initial={{ y: isBottom ? 100 : -100 }}
          animate={{ y: 0 }}
          exit={{ y: isBottom ? 100 : -100 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          aria-label="Sponsored Advertisement"
          className={`
            fixed left-0 right-0 z-30 w-full
            ${isBottom ? 'bottom-0' : 'top-0'}
            /* Height constraints */
            min-h-[50px] sm:min-h-[60px]
            glass
            ${isBottom ? 'border-t' : 'border-b'} border-[#2D305A]
            shadow-[0_-8px_24px_rgba(0,0,0,0.5)]
            pb-[env(safe-area-inset-bottom)]
          `}
        >
          <div className="max-w-6xl mx-auto h-full px-4 sm:px-8 flex items-center justify-between gap-3 min-h-[50px] sm:min-h-[60px]">
            {/* Left: Ad Identifier & Sponsor */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#1A1B35] border border-[#2D305A] text-slate-400 select-none font-heading"
                aria-label="Advertisement"
              >
                Ad
              </span>
              <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-[#FFD166] font-heading">
                <Zap className="w-3.5 h-3.5 fill-[#FFD166]" />
                <span>{sponsor}</span>
              </div>
            </div>

            {/* Center: Ad Copy / Click-through */}
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="flex-1 min-w-0 flex items-center justify-center gap-2 group cursor-pointer text-center px-2 hover:opacity-90 transition-opacity"
            >
              <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate group-hover:text-white">
                <span className="sm:hidden font-bold text-[#FFD166] font-heading mr-1">{sponsor} •</span>
                {title}
              </p>
              <span className="hidden md:inline-flex items-center gap-1 text-xs font-bold font-heading text-[#00FFCC] bg-[#00FFCC]/10 hover:bg-[#00FFCC]/20 border border-[#00FFCC]/30 px-3 py-1 rounded-xl transition-all shrink-0">
                {ctaText} <ExternalLink className="w-3 h-3" />
              </span>
            </a>

            {/* Right: Isolated Dismiss Button */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss advertisement"
                className="
                  relative -mr-1 p-2.5 sm:p-3 rounded-xl
                  text-slate-400 hover:text-slate-100 hover:bg-[#1A1B35]
                  border border-transparent hover:border-[#2D305A]
                  transition-colors cursor-pointer active:scale-90
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00FFCC]
                "
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
