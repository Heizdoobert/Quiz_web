'use client';

import React from 'react';
import { Layers, Coins, Gamepad2, Cpu } from 'lucide-react';

export interface CategoryOption {
  id: string;
  name: string;
  bgClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CATEGORIES: CategoryOption[] = [
  {
    id: 'All',
    name: 'All Topics',
    bgClass: 'bg-neo-mint',
    icon: Layers,
  },
  {
    id: 'DeFi',
    name: 'DeFi',
    bgClass: 'bg-cat-defi',
    icon: Coins,
  },
  {
    id: 'NFT & Gaming',
    name: 'NFT & Gaming',
    bgClass: 'bg-cat-nft',
    icon: Gamepad2,
  },
  {
    id: 'Layer 1 & Infra',
    name: 'Layer 1 / Tech',
    bgClass: 'bg-cat-l1',
    icon: Cpu,
  },
];

interface CategoryBarProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  className?: string;
}

export default function CategoryBar({
  selectedCategory,
  onSelectCategory,
  className = '',
}: CategoryBarProps) {
  return (
    <div
      className={`w-full flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1 ${className}`}
      role="tablist"
      aria-label="Quiz Categories"
    >
      {CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        const isSelectedMint = isSelected && cat.bgClass === 'bg-neo-mint';
        const selectedTextClass = isSelectedMint ? 'text-deep-space' : 'text-white';
        const Icon = cat.icon;

        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectCategory(cat.id)}
            className={`glass-border flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold font-heading whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] ${
              isSelected
                ? `${cat.bgClass} ${selectedTextClass} scale-[1.02]`
                : 'bg-[#1A1B35]/60 hover:bg-[#1A1B35] text-slate-400 hover:text-slate-200'
            }`}
          >
            <span
              className={`flex items-center justify-center ${isSelected ? selectedTextClass : 'text-slate-400'}`}
            >
              <Icon className="w-3.5 h-3.5" />
            </span>
            <span>{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
