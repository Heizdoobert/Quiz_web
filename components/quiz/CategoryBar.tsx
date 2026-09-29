'use client';

import React, { useEffect, useState } from 'react';
import { Layers, Hash } from 'lucide-react';
import { getTopics } from '@/lib/actions/question-actions';

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
  const [topics, setTopics] = useState<Array<{ name: string; questionCount: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    getTopics().then((result) => {
      if (!cancelled) setTopics(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const options = [{ id: 'All', name: 'All Topics' }, ...topics.map((t) => ({ id: t.name, name: t.name }))];

  return (
    <div
      className={`w-full flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1 ${className}`}
      role="tablist"
      aria-label="Quiz Categories"
    >
      {options.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        const Icon = cat.id === 'All' ? Layers : Hash;

        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectCategory(cat.id)}
            className={`glass-border flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold font-heading whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC] ${
              isSelected
                ? 'bg-neo-mint text-deep-space scale-[1.02]'
                : 'bg-[#1A1B35]/60 hover:bg-[#1A1B35] text-slate-400 hover:text-slate-200'
            }`}
          >
            <span
              className={`flex items-center justify-center ${isSelected ? 'text-deep-space' : 'text-slate-400'}`}
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
