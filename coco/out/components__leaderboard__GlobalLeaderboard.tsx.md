# components/leaderboard/GlobalLeaderboard.tsx
lines:117 exports:default
---
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LeaderboardEntry } from '@/lib/types';
import { usePagination } from '@/hooks/shared/use-pagination';
import { Trophy, Medal, ChevronLeft, ChevronRight } from 'lucide-react';

interface GlobalLeaderboardProps {
  entries: LeaderboardEntry[];
  loading: boolean;
}

const PAGE_SIZE = 5;

export default function GlobalLeaderboard({ entries, loading }: GlobalLeaderboardProps) {
  const { totalPages, safePage, pagedEntries, goToPrevPage, goToNextPage } = usePagination(
    entries,
    PAGE_SIZE
  );

  if (loading) {
    return <p className="text-xs text-slate-400 text-center py-6">Loading leaderboard...</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-6 text-slate-500 text-xs italic">
        No records yet. Complete a quiz to rank!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Entries List with Min-Height to Prevent Layout Shift */}
      <div className="space-y-2 min-h-[260px]">
        {pagedEntries.map((entry, index) => {
          const isTop1 = entry.rank === 1;
          const isTop2 = entry.rank === 2;
