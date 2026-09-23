'use client';

import React, { useState } from 'react';
import { LeaderboardEntry } from '@/lib/types';
import { Trophy, Medal, ChevronLeft, ChevronRight } from 'lucide-react';

interface GlobalLeaderboardProps {
  entries: LeaderboardEntry[];
  loading: boolean;
}

const PAGE_SIZE = 5;

export default function GlobalLeaderboard({ entries, loading }: GlobalLeaderboardProps) {
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedEntries = entries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-3">
      {/* Entries List with Min-Height to Prevent Layout Shift */}
      <div className="space-y-2 min-h-[260px]">
        {pagedEntries.map((entry) => {
          const isTop1 = entry.rank === 1;
          const isTop2 = entry.rank === 2;
          const isTop3 = entry.rank === 3;

          return (
            <div
              key={entry.wallet_address}
              className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-xs ${
                isTop1
                  ? 'bg-[#FFD166]/10 border-[#FFD166]/40 shadow-[0_0_15px_rgba(255,209,102,0.15)]'
                  : 'bg-[#0A1128]/80 border-[#2D305A] hover:border-[#6C5CE7]/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-6 flex items-center justify-center font-heading font-bold text-slate-300">
                  {isTop1 ? (
                    <Trophy className="w-4 h-4 text-[#FFD166]" />
                  ) : isTop2 ? (
                    <Medal className="w-4 h-4 text-slate-300" />
                  ) : isTop3 ? (
                    <Medal className="w-4 h-4 text-[#FF8A65]" />
                  ) : (
                    <span className="text-[11px] text-slate-400">#{entry.rank}</span>
                  )}
                </span>
                <div>
                  <span className={`font-bold ${isTop1 ? 'text-[#FFD166]' : 'text-slate-200'}`}>
                    {entry.display_name || entry.wallet_address.slice(0, 10)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-medium">{entry.accuracy}% acc</span>
                <span className="font-heading font-black text-[#00FFCC]">{entry.score} pts</span>
              </div>
            </div>
          );
        })}
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
