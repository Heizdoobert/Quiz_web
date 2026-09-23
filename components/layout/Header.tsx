'use client';

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Gift, Zap, Volume2, VolumeX, User } from 'lucide-react';
import { useSoundToggle } from '@/hooks/shared/use-sound-toggle';

interface HeaderProps {
  onOpenRewards?: () => void;
  onOpenProfile?: () => void;
  hasClaimable?: boolean;
  isConnected?: boolean;
}

export default function Header({
  onOpenRewards,
  onOpenProfile,
  hasClaimable,
  isConnected,
}: HeaderProps) {
  const { isMuted, handleToggleSound } = useSoundToggle();

  return (
    <header className="glass flex justify-between items-center px-4 sm:px-8 py-3.5 border-b border-[#2D305A] sticky top-0 z-30 shadow-lg">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-xl bg-[#00FFCC]/15 border border-[#00FFCC]/40 text-[#00FFCC] shadow-[0_0_12px_rgba(0,255,204,0.2)]">
          <Zap className="w-5 h-5 animate-pulse" />
        </div>
        <h1 className="text-2xl font-black font-heading tracking-wider bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] bg-clip-text text-transparent">
          Quick Quiz
        </h1>
      </div>
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Sound FX Toggle Button */}
        <button
          type="button"
          onClick={handleToggleSound}
          className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] ${
            isMuted
              ? 'bg-[#25284D]/50 border-[#3A3E70]/60 text-slate-500 hover:text-slate-300'
              : 'bg-[#25284D] border-[#3A3E70] text-[#00FFCC] shadow-[0_0_10px_rgba(0,255,204,0.15)] hover:border-[#00FFCC]/60'
          }`}
          title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          aria-label={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Profile Button */}
        {isConnected && onOpenProfile && (
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25284D] hover:bg-[#2E3260] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] border border-[#3A3E70] text-slate-200 hover:text-white font-bold font-heading text-xs transition-all shadow-sm hover:scale-105 cursor-pointer"
            aria-label="Player Profile"
          >
            <User className="w-4 h-4 text-[#6C5CE7]" />
            <span className="hidden sm:inline">Profile</span>
          </button>
        )}

        {/* Rewards Button */}
        {isConnected && onOpenRewards && (
          <button
            type="button"
            onClick={onOpenRewards}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25284D] hover:bg-[#2E3260] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] border border-[#3A3E70] text-[#FFD166] font-bold font-heading text-xs transition-all shadow-[0_0_15px_rgba(255,209,102,0.12)] hover:scale-105 cursor-pointer"
            aria-label="Rewards"
          >
            <Gift className="w-4 h-4 text-[#FFD166]" />
            <span className="hidden sm:inline">Rewards</span>
            {hasClaimable && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00FFCC] rounded-full animate-ping shadow-[0_0_8px_#00FFCC]" />
            )}
          </button>
        )}

        <ConnectButton showBalance={false} />
      </div>
    </header>
  );
}
