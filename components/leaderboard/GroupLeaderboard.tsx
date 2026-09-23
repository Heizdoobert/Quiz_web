'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LeaderboardEntry } from '@/lib/types';
import { usePagination } from '@/hooks/shared/use-pagination';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Entries List with Min-Height to Prevent Layout Shift */}
      <div className="space-y-2 min-h-[260px]">
        {pagedEntries.map((entry, index) => (
          <motion.div
            key={entry.wallet_address}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`flex items-center justify-between p-3 rounded-2xl border border-[#2D305A] hover:border-[#6C5CE7]/60 text-xs transition-colors ${
              index % 2 === 0
                ? 'bg-[color:var(--color-deep-space)]'
                : 'bg-[color:var(--color-elevation-2)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-[#6C5CE7]">#{entry.rank}</span>
              <span className="font-bold text-slate-200">
                {entry.display_name || entry.wallet_address.slice(0, 10)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-medium">{entry.accuracy}%</span>
              <span className="font-heading font-black text-[#00FFCC]">{entry.score} pts</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-[#2D305A] text-xs">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={goToPrevPage}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#25284D] hover:bg-[#2E3260] disabled:opacity-40 disabled:pointer-events-none text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00FFCC]"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <span className="font-mono text-[11px] text-slate-400 font-medium">
            Page <strong className="text-slate-200">{safePage}</strong> of {totalPages}
          </span>

          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={goToNextPage}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#25284D] hover:bg-[#2E3260] disabled:opacity-40 disabled:pointer-events-none text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00FFCC]"
            aria-label="Next Page"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
