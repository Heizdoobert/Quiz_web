'use client';

import React from 'react';
import { Share2 } from 'lucide-react';

interface SocialShareProps {
  score: number;
  streak: number;
}

export function SocialShare({ score, streak }: SocialShareProps) {
  const getShareUrl = () => {
    return `${window.location.origin}/`;
  };

  const handleShare2Share = () => {
    const text = `I just hit a streak of ${streak} and score of ${score} on Quick Quiz! 🚀`;
    const url = getShareUrl();
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleFarcasterShare = () => {
    const text = `I just hit a streak of ${streak} and score of ${score} on Quick Quiz! 🚀`;
    const url = getShareUrl();
    const castUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`;
    window.open(castUrl, '_blank');
  };

  return (
    <div className="flex items-center gap-3 mt-4 w-full">
      <div className="flex-1 flex gap-2">
        <button
          onClick={handleShare2Share}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 font-semibold text-xs border border-[#1DA1F2]/30 transition-all cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>X / Share2</span>
        </button>
        <button
          onClick={handleFarcasterShare}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#8a63d2]/10 text-[#8a63d2] hover:bg-[#8a63d2]/20 font-semibold text-xs border border-[#8a63d2]/30 transition-all cursor-pointer"
        >
          {/* Farcaster icon approximation */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
          <span>Farcaster</span>
        </button>
      </div>
    </div>
  );
}
