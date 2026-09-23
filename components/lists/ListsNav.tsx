'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Zap, ArrowLeft } from 'lucide-react';

const TABS = [
  { href: '/my-lists', label: 'My Lists' },
  { href: '/review', label: 'Review Queue' },
  { href: '/contest', label: 'Contests' },
];

export default function ListsNav() {
  const pathname = usePathname();

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-8 py-3.5 border-b border-[#2D305A] bg-[#1A1B35]/90 backdrop-blur-md sticky top-0 z-30 shadow-lg">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-[#00FFCC] transition-all">
          <ArrowLeft className="w-4 h-4" />
          <span className="p-1.5 rounded-xl bg-[#00FFCC]/15 border border-[#00FFCC]/40 text-[#00FFCC]">
            <Zap className="w-4 h-4" />
          </span>
        </Link>
        <nav className="flex gap-1.5 bg-[#0A1128]/80 border border-[#2D305A] rounded-xl p-1.5">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                pathname === tab.href
                  ? 'bg-[#00FFCC]/15 text-[#00FFCC]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <ConnectButton showBalance={false} chainStatus="icon" />
    </header>
  );
}
