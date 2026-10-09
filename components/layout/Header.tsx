"use client";

import React from "react";
import Link from "next/link";
import { Zap, Volume2, VolumeX, User, LogOut } from "lucide-react";
import { useSoundToggle } from "@/hooks/shared/use-sound-toggle";
import { useSession } from "@/hooks/shared/use-session";
import { signOut } from "@/lib/actions/auth-actions";
import SearchBox from "@/components/discovery/SearchBox";

interface HeaderProps {
  onOpenProfile?: () => void;
}

export default function Header({ onOpenProfile }: HeaderProps) {
  const { isMuted, handleToggleSound } = useSoundToggle();
  const { account, requireSignIn, clearSession } = useSession();

  const handleSignOut = async () => {
    await signOut();
    clearSession();
  };

  return (
    <header className="glass flex justify-between items-center px-4 sm:px-8 py-3.5 border-b border-cyber-border sticky top-0 z-30 shadow-lg">
      <Link
        href="/"
        className="flex items-center gap-2.5 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint rounded-xl group transition-transform active:scale-95"
        aria-label="Quick Quiz Home"
      >
        <div className="shrink-0 p-1.5 rounded-xl bg-neo-mint/15 border border-neo-mint/40 text-neo-mint group-hover:scale-105 transition-transform">
          <Zap className="w-5 h-5 animate-pulse" />
        </div>
        <span className="text-lg sm:text-2xl truncate font-black font-heading tracking-wider bg-linear-to-r from-neo-mint to-electric-indigo bg-clip-text text-transparent">
          Quick Quiz
        </span>
      </Link>
      <SearchBox />
      {/* min-h reserves the Sign In button's height; it mounts after the session loads and shifted the page */}
      <div className="flex shrink-0 min-h-10 items-center gap-2.5 sm:gap-3">
        {/* Sound FX Toggle Button */}
        <button
          type="button"
          onClick={handleToggleSound}
          className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint ${
            isMuted
              ? "bg-cyber-violet-light/50 border-[#3A3E70]/60 text-slate-500 hover:text-slate-300"
              : "bg-cyber-violet-light border-[#3A3E70] text-neo-mint hover:border-neo-mint/60"
          }`}
          title={isMuted ? "Unmute Sound Effects" : "Mute Sound Effects"}
          aria-label={isMuted ? "Unmute Sound Effects" : "Mute Sound Effects"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>

        {/* Profile Button */}
        {account && onOpenProfile && (
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyber-violet-light hover:bg-[#2E3260] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint border border-[#3A3E70] text-slate-200 hover:text-white font-bold font-heading text-xs transition-all shadow-sm hover:scale-105 cursor-pointer"
            aria-label="Player Profile"
          >
            <User className="w-4 h-4 text-electric-indigo" />
            <span className="hidden sm:inline">Profile</span>
          </button>
        )}

        {account ? (
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyber-violet-light hover:bg-[#2E3260] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint border border-[#3A3E70] text-slate-200 hover:text-white font-bold font-heading text-xs transition-all shadow-sm hover:scale-105 cursor-pointer"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void requireSignIn()}
            className="px-4 py-2 rounded-xl bg-linear-to-r from-neo-mint to-electric-indigo text-deep-space font-black font-heading text-sm cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}
