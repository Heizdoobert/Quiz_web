# components/leaderboard/LeaderboardPanel.tsx
lines:97 exports:default
---
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LeaderboardEntry } from '@/lib/types';
import { useSession } from '@/hooks/shared/use-session';
import GlobalLeaderboard from './GlobalLeaderboard';
import GroupLeaderboard from './GroupLeaderboard';
import { Shield, Trophy, Users } from 'lucide-react';
import { useIntersectionObserver } from '@/hooks/shared/use-intersection';

interface LeaderboardPanelProps {
  globalEntries: LeaderboardEntry[];
  groupEntries: LeaderboardEntry[];
  loading: boolean;
  onOpenGroupModal: () => void;
  refreshLeaderboard?: () => void;
  onVisibilityChange?: (visible: boolean) => void;
  className?: string;
}

export default function LeaderboardPanel({
  globalEntries,
  groupEntries,
  loading,
  onOpenGroupModal,
  refreshLeaderboard,
  onVisibilityChange,
  className = '',
}: LeaderboardPanelProps) {
  const [activeTab, setActiveTab] = useState<'global' | 'group'>('global');
  const { account } = useSession();
  
  const panelRef = useRef<HTMLElement>(null);
  const isVisible = useIntersectionObserver(panelRef, { threshold: 0.1 });

  useEffect(() => {
    if (onVisibilityChange) {
      onVisibilityChange(isVisible);
    }
  }, [isVisible, onVisibilityChange]);
