'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Gift } from 'lucide-react';

interface HeaderProps {
  onOpenRewards?: () => void;
  hasClaimable?: boolean;
  isConnected?: boolean;
}

export default function Header({ onOpenRewards, hasClaimable, isConnected }: HeaderProps) {
  return (
    <header className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800">
      <h1 className="text-2xl font-bold text-blue-400">Quick Quiz</h1>
      <div className="flex items-center gap-3">
        {isConnected && onOpenRewards && (
          <button
            onClick={onOpenRewards}
            className="relative p-2 rounded-lg bg-slate-700/60 hover:bg-slate-600/60 text-amber-400 transition-colors"
            aria-label="Rewards"
          >
            <Gift className="w-5 h-5" />
            {hasClaimable && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
            )}
          </button>
        )}
        <ConnectButton />
      </div>
    </header>
  );
}
