"use client";

import React from "react";
import { motion } from "framer-motion";
import { LeaderboardEntry } from "@/lib/types";
import { usePagination } from "@/hooks/shared/use-pagination";
import { Trophy, Medal, ChevronLeft, ChevronRight } from "lucide-react";

interface GlobalLeaderboardProps {
  entries: LeaderboardEntry[];
  loading: boolean;
}

const PAGE_SIZE = 5;

export default function GlobalLeaderboard({
  entries: initialEntries,
  loading: initialLoading,
}: GlobalLeaderboardProps) {
  const [entries, setEntries] =
    React.useState<LeaderboardEntry[]>(initialEntries);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(initialEntries.length >= 50);

  const [prevInitial, setPrevInitial] = React.useState(initialEntries);

  if (initialEntries !== prevInitial) {
    setPrevInitial(initialEntries);
    setEntries(initialEntries);
    setHasMore(initialEntries.length >= 50);
  }

  const { totalPages, safePage, pagedEntries, goToPrevPage, goToNextPage } =
    usePagination(entries, PAGE_SIZE);

  const handleNextPage = async () => {
    if (safePage >= totalPages && hasMore && !loadingMore) {
      setLoadingMore(true);
      const { getGlobalLeaderboard } =
        await import("@/lib/actions/leaderboard-actions");
      const moreEntries = await getGlobalLeaderboard(50, entries.length);
      if (moreEntries.length < 50) setHasMore(false);
      setEntries((prev) => [...prev, ...moreEntries]);
      setLoadingMore(false);
    }
    goToNextPage();
  };

  if (initialLoading) {
    return (
      <p className="text-xs text-slate-400 text-center py-6">
        Loading leaderboard...
      </p>
    );
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
      <div className="space-y-2 min-h-65">
        {pagedEntries.map((entry, index) => {
          const isTop1 = entry.rank === 1;
          const isTop2 = entry.rank === 2;
          const isTop3 = entry.rank === 3;
          const isTopThree = entry.rank <= 3;

          return (
            <motion.div
              key={entry.user_id + entry.rank}
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
              <div className="flex items-center gap-2.5">
                <span className="w-6 flex items-center justify-center font-heading font-bold text-slate-300">
                  {isTop1 ? (
                    <Trophy className="w-4 h-4 text-crypto-gold" />
                  ) : isTop2 ? (
                    <Medal className="w-4 h-4 text-slate-300" />
                  ) : isTop3 ? (
                    <Medal className="w-4 h-4 text-[#FF8A65]" />
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      #{entry.rank}
                    </span>
                  )}
                </span>
                <div>
                  <span
                    className={`font-bold ${isTop1 ? "text-crypto-gold" : "text-slate-200"}`}
                  >
                    {entry.display_name ||
                      entry.wallet_address?.slice(0, 10) ||
                      "Player"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-medium">
                  {entry.accuracy}% acc
                </span>
                <span className="font-heading font-black text-neo-mint">
                  {entry.score} pts
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {(totalPages > 1 || hasMore) && (
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
            {loadingMore ? (
              <span className="animate-pulse">Loading...</span>
            ) : (
              <>
                Page <strong className="text-slate-200">{safePage}</strong> of{" "}
                {totalPages}
              </>
            )}
          </span>

          <button
            type="button"
            disabled={(!hasMore && safePage >= totalPages) || loadingMore}
            onClick={handleNextPage}
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
