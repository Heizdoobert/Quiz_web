# components/leaderboard/GroupLeaderboard.tsx
lines:127 exports:default
---
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LeaderboardEntry } from '@/lib/types';
import { usePagination } from '@/hooks/shared/use-pagination';
import { ChevronLeft, ChevronRight, Trophy, Medal } from 'lucide-react';

interface GroupLeaderboardProps {
  entries: LeaderboardEntry[];
  loading: boolean;
  onOpenGroupModal: () => void;
}

const PAGE_SIZE = 5;

export default function GroupLeaderboard({
  entries,
  loading,
  onOpenGroupModal,
}: GroupLeaderboardProps) {
  const { totalPages, safePage, pagedEntries, goToPrevPage, goToNextPage } = usePagination(
    entries,
    PAGE_SIZE
  );

  if (loading) {
    return <p className="text-xs text-slate-400 text-center py-6">Loading group ranking...</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-xs text-slate-400">No member activity recorded yet for this group.</p>
        <button
          type="button"
          onClick={onOpenGroupModal}
          className="px-3.5 py-1.5 bg-[#6C5CE7]/20 hover:bg-[#6C5CE7] text-[#6C5CE7] hover:text-white border border-[#6C5CE7]/40 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00FFCC]"
        >
          Manage Groups
