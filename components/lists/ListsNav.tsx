'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Zap, ArrowLeft } from 'lucide-react';
import { useSession } from '@/hooks/shared/use-session';

const GUEST_TABS = [{ href: '/contest', label: 'Contests' }];
const SIGNED_IN_TABS = [
  { href: '/my-lists', label: 'My Lists' },
  { href: '/review', label: 'Review Queue' },
  { href: '/contest', label: 'Contests' },
];

export default function ListsNav() {
  const pathname = usePathname();
  const { account } = useSession();
  const tabs = account ? SIGNED_IN_TABS : GUEST_TABS;

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-8 py-3.5 border-b border-cyber-border bg-cyber-violet/90 backdrop-blur-md sticky top-0 z-30 shadow-lg">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-neo-mint transition-all">
          <ArrowLeft className="w-4 h-4" />
          <span className="p-1.5 rounded-xl bg-neo-mint/15 border border-neo-mint/40 text-neo-mint">
            <Zap className="w-4 h-4" />
          </span>
        </Link>
        <nav className="flex gap-1.5 bg-deep-space/80 border border-cyber-border rounded-xl p-1.5">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                pathname === tab.href
                  ? 'bg-neo-mint/15 text-neo-mint'
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
