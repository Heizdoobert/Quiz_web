'use client';

import React from 'react';
import { Layers, Coins, Gamepad2, Cpu } from 'lucide-react';

export interface CategoryOption {
  id: string;
  name: string;
  color: string;
  glowColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CATEGORIES: CategoryOption[] = [
  {
    id: 'All',
    name: 'All Topics',
    color: '#00FFCC',
    glowColor: 'rgba(0, 255, 204, 0.25)',
    icon: Layers,
  },
  {
    id: 'DeFi',
    name: 'DeFi',
    color: '#8A2BE2',
    glowColor: 'rgba(138, 43, 226, 0.3)',
    icon: Coins,
  },
  {
    id: 'NFT & Gaming',
    name: 'NFT & Gaming',
    color: '#FF007F',
    glowColor: 'rgba(255, 0, 127, 0.3)',
    icon: Gamepad2,
  },
  {
    id: 'Layer 1 & Infra',
    name: 'Layer 1 / Tech',
    color: '#3071FF',
    glowColor: 'rgba(48, 113, 255, 0.3)',
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
        const Icon = cat.icon;

        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectCategory(cat.id)}
            style={{
              borderColor: isSelected ? cat.color : '#2D305A',
              boxShadow: isSelected ? `0 0 14px ${cat.glowColor}` : 'none',
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold font-heading whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] ${
              isSelected
                ? 'bg-[#1A1B35] text-white scale-102'
                : 'bg-[#1A1B35]/60 hover:bg-[#1A1B35] text-slate-400 hover:text-slate-200 border-[#2D305A]'
            }`}
          >
            <span
              style={{ color: isSelected ? cat.color : '#94A3B8' }}
              className="flex items-center justify-center"
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
