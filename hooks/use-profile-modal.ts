'use client';

import { useState } from 'react';

interface PlayerTier {
  title: string;
  color: string;
}

function getPlayerTier(totalAnswered: number, score: number): PlayerTier {
  if (totalAnswered >= 50 && score >= 40) return { title: 'Web3 Grandmaster', color: '#00FFCC' };
  if (totalAnswered >= 25) return { title: 'DeFi Voyager', color: '#6C5CE7' };
  if (totalAnswered >= 10) return { title: 'Crypto Cadet', color: '#FFD166' };
  return { title: 'Novice Explorer', color: '#94A3B8' };
}

interface UseProfileModalOptions {
  address?: string;
  totalAnswered: number;
  score: number;
}

export function useProfileModal({ address, totalAnswered, score }: UseProfileModalOptions) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tier = getPlayerTier(totalAnswered, score);
  const formattedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : 'Not Connected';

  return { copied, handleCopy, tier, formattedAddress };
}
