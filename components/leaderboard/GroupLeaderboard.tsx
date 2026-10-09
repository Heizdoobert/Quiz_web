"use client";

import React from "react";
import { motion } from "framer-motion";
import { LeaderboardEntry } from "@/lib/types";
import { usePagination } from "@/hooks/shared/use-pagination";
import { ChevronLeft, ChevronRight, Trophy, Medal } from "lucide-react";

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
  const { totalPages, safePage, pagedEntries, goToPrevPage, goToNextPage } =
    usePagination(entries, PAGE_SIZE);

  if (loading) {
    return (
      <p className="text-xs text-slate-400 text-center py-6">
        Loading group ranking...
      </p>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-xs text-slate-400">
          No member activity recorded yet for this group.
        </p>
        <button
          type="button"
          onClick={onOpenGroupModal}
          className="px-3.5 py-1.5 bg-electric-indigo/20 hover:bg-electric-indigo text-electric-indigo hover:text-white border border-electric-indigo/40 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neo-mint"
        >
          Manage Groups
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Entries List with Min-Height to Prevent Layout Shift */}
      <div className="space-y-2 min-h-65">
        {pagedEntries.map((entry, index) => {
          const isTop1 = entry.rank === 1;
          const isTop2 = entry.rank === 2;
          const isTop3 = entry.rank === 3;
          const isTopThree = entry.rank <= 3;

          return (
            <div key={entry.user_id + "-" + entry.rank} className="relative">
              {/* Highlight Flash on Score Update */}
              <motion.div
                key={`flash-${entry.score}`}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute inset-0 bg-neo-mint/40 rounded-2xl pointer-events-none z-10"
              />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-xs ${
                  isTopThree
                    ? "glass-border border-transparent bg-linear-to-br from-crypto-gold/20 to-pop-coral/20"
                    : index % 2 === 0
                      ? "bg-deep-space border-cyber-border hover:border-electric-indigo/60"
                      : "bg-elevation-2 border-cyber-border hover:border-electric-indigo/60"
                }`}
              >
                <div className="flex items-center gap-2">
                <span className="w-6 flex items-center justify-center font-heading font-bold text-electric-indigo">
                  {isTop1 ? (
                    <Trophy className="w-4 h-4 text-crypto-gold" />
                  ) : isTop2 ? (
                    <Medal className="w-4 h-4 text-slate-300" />
                  ) : isTop3 ? (
                    <Medal className="w-4 h-4 text-[#FF8A65]" />
                  ) : (
                    <span className="text-[11px]">#{entry.rank}</span>
                  )}
                </span>
                <span
                  className={`font-bold ${isTop1 ? "text-crypto-gold" : "text-slate-200"}`}
                >
                  {entry.display_name || "Player"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-medium">
                  {entry.accuracy}%
                </span>
                <span className="font-heading font-black text-neo-mint">
                  {entry.score} pts
                </span>
              </div>
            </motion.div>
          </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-cyber-border text-xs">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={goToPrevPage}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyber-violet-light hover:bg-[#2E3260] disabled:opacity-40 disabled:pointer-events-none text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neo-mint"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <span className="font-mono text-[11px] text-slate-400 font-medium">
            Page <strong className="text-slate-200">{safePage}</strong> of{" "}
            {totalPages}
          </span>

          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={goToNextPage}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyber-violet-light hover:bg-[#2E3260] disabled:opacity-40 disabled:pointer-events-none text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neo-mint"
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
