# components/community/SocialShare.tsx
lines:58 exports:SocialShare
---
'use client';

import React from 'react';
import { Share2 } from 'lucide-react';
import { useSession } from '@/hooks/shared/use-session';

interface SocialShareProps {
  score: number;
  streak: number;
}

export function SocialShare({ score, streak }: SocialShareProps) {
  const { account } = useSession();
  
  const getShareUrl = () => {
    let url = `${window.location.origin}/`;
    if (account?.wallet) {
      url += `?ref=${account.wallet}`;
    }
    return url;
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
