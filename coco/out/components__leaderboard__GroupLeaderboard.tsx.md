# components/leaderboard/GroupLeaderboard.tsx
lines:149 exports:default
---
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
