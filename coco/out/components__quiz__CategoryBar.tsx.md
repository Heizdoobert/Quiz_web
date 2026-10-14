# components/quiz/CategoryBar.tsx
lines:66 exports:default
---
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
