# components/leaderboard/GlobalLeaderboard.tsx
lines:174 exports:default
---
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
