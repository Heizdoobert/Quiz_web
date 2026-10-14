# components/community/SocialShare.tsx
lines:51 exports:SocialShare
---
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
