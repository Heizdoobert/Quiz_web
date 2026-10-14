# components/layout/Header.tsx
lines:95 exports:default
---
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
