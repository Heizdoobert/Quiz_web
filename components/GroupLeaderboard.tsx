'use client';

import React, { useState } from 'react';
import { LeaderboardEntry } from '@/lib/types';
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
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedEntries = entries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-3">
      {/* Entries List with Min-Height to Prevent Layout Shift */}
      <div className="space-y-2 min-h-[260px]">
        {pagedEntries.map((entry) => (
          <div
            key={entry.wallet_address}
            className="flex items-center justify-between p-3 rounded-2xl bg-[#0A1128]/80 border border-[#2D305A] hover:border-[#6C5CE7]/60 text-xs transition-colors"
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
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-[#2D305A] text-xs">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
