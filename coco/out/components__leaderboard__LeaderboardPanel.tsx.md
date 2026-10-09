# components/leaderboard/LeaderboardPanel.tsx
lines:116 exports:default
---
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LeaderboardEntry } from '@/lib/types';
import { useSession } from '@/hooks/shared/use-session';
import GlobalLeaderboard from './GlobalLeaderboard';
import GroupLeaderboard from './GroupLeaderboard';
import { Shield, Trophy, Users } from 'lucide-react';
import { useIntersectionObserver } from '@/hooks/shared/use-intersection';
import { supabase } from '@/lib/supabase/supabase';
import debounce from 'lodash.debounce';

interface LeaderboardPanelProps {
  globalEntries: LeaderboardEntry[];
  groupEntries: LeaderboardEntry[];
  loading: boolean;
  onOpenGroupModal: () => void;
  refreshLeaderboard?: () => void;
  className?: string;
}

export default function LeaderboardPanel({
  globalEntries,
  groupEntries,
  loading,
  onOpenGroupModal,
  refreshLeaderboard,
  className = '',
}: LeaderboardPanelProps) {
  const [activeTab, setActiveTab] = useState<'global' | 'group'>('global');
  const { account } = useSession();
  
  const panelRef = useRef<HTMLElement>(null);
  const isVisible = useIntersectionObserver(panelRef, { threshold: 0.1 });

  const debouncedRefresh = useMemo(() => {
    if (!refreshLeaderboard) return null;
    return debounce(refreshLeaderboard, 5000, { leading: true, trailing: true });
  }, [refreshLeaderboard]);

