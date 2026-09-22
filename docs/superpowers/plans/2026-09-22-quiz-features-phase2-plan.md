# Quick Quiz Phase 2: Full Quiz Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete interactive quiz experience on top of Next.js, Supabase, and Web3, including Quiz Card (3D flip), Server Actions data layer, live Stats Sidebar, Question Form, Groups & Leaderboards, responsive Ad Zones, and Modals.

**Architecture:** Next.js App Router client components coordinated by a central `QuizLayout` reducer, with data persistence and answer verification handled securely by Next.js Server Actions querying Supabase. Responsive layout with sticky desktop skyscraper ads, horizontal banners, and collapsible modals.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase JS Client, Wagmi v2 / Viem, RainbowKit, Framer Motion, Canvas-Confetti, Lucide React.

**Spec:** `docs/superpowers/specs/2026-09-22-quiz-features-phase2-design.md`

## Global Constraints
- Use Next.js App Router (`app/` directory).
- All styling using Tailwind CSS v4 and existing dark theme palette (`#0f172a` slate-900 background, `#1e293b` slate-800 cards, `#3b82f6` blue accents).
- Never send `correct_index` to the client prior to answer submission.
- Server Actions must handle missing environment variables or database errors gracefully without throwing unhandled exceptions.
- Ad zones must be responsive: skyscrapers on desktop (≥1280px), banners on tablet/mobile.
- Run `npm run lint` and `npm run build` after each task to verify zero errors and clean builds.

---

### Task 1: TypeScript Types & Supabase Schema Helper

**Files:**
- Create: `lib/types.ts`
- Create: `lib/schema.sql`

**Interfaces:**
- Produces: Data interfaces (`User`, `Question`, `ClientQuestion`, `QuizResult`, `Group`, `UserStats`, `LeaderboardEntry`, `QuizState`) used across all subsequent tasks.

- [ ] **Step 1: Create `lib/types.ts`**
Create `lib/types.ts` containing the shared domain types:
```typescript
export interface User {
  wallet_address: string;
  display_name: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  category: string;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  created_by: string;
  created_at: string;
}

export interface ClientQuestion {
  id: string;
  category: string;
  prompt: string;
  options: string[];
}

export interface QuizResult {
  id: string;
  wallet_address: string;
  question_id: string;
  answer_index: number;
  is_correct: boolean;
  answered_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  owner_wallet: string;
  created_at: string;
}

export interface UserStats {
  score: number;
  streak: number;
  bestStreak: number;
  accuracy: number;
  totalAnswered: number;
}

export interface LeaderboardEntry {
  wallet_address: string;
  display_name: string | null;
  score: number;
  accuracy: number;
  rank: number;
}

export interface AnswerSubmissionResult {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string | null;
}
```

- [ ] **Step 2: Create `lib/schema.sql`**
Create `lib/schema.sql` containing the PostgreSQL schema definition for Supabase:
```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  wallet_address TEXT PRIMARY KEY,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'General',
  prompt TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INT NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  explanation TEXT,
  created_by TEXT REFERENCES users(wallet_address) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz results log table
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_index INT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_wallet ON quiz_results(wallet_address);
CREATE INDEX IF NOT EXISTS idx_quiz_results_question ON quiz_results(question_id);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  owner_wallet TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_group_members_wallet ON group_members(wallet_address);
```

- [ ] **Step 3: Verify build and lint**
```bash
npm run lint && npm run build
```
Expected: Exit 0, no TypeScript or ESLint errors.

- [ ] **Step 4: Commit**
```bash
git add lib/types.ts lib/schema.sql
git commit -m "feat: define domain types and supabase schema helper"
```

---

### Task 2: Supabase Server Actions

**Files:**
- Create: `lib/actions/user-actions.ts`
- Create: `lib/actions/question-actions.ts`
- Create: `lib/actions/quiz-actions.ts`
- Create: `lib/actions/leaderboard-actions.ts`
- Create: `lib/actions/group-actions.ts`

**Interfaces:**
- Consumes: `lib/supabase.ts`, `lib/types.ts`
- Produces: Server actions callable by client components for all database operations.

- [ ] **Step 1: Create `lib/actions/user-actions.ts`**
Implement `getOrCreateUser(walletAddress: string): Promise<User | null>`:
```typescript
'use server';

import { supabase } from '@/lib/supabase';
import { User } from '@/lib/types';

export async function getOrCreateUser(walletAddress: string): Promise<User | null> {
  if (!walletAddress) return null;
  const normalized = walletAddress.toLowerCase();

  try {
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', normalized)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user:', fetchError);
      return { wallet_address: normalized, display_name: null, created_at: new Date().toISOString() };
    }

    if (existingUser) {
      return existingUser as User;
    }

    const newUser = {
      wallet_address: normalized,
      display_name: `${normalized.slice(0, 6)}...${normalized.slice(-4)}`,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert(newUser)
      .select()
      .single();

    if (insertError) {
      console.warn('Could not persist new user, using fallback:', insertError.message);
      return newUser;
    }

    return inserted as User;
  } catch (err) {
    console.error('getOrCreateUser exception:', err);
    return { wallet_address: normalized, display_name: null, created_at: new Date().toISOString() };
  }
}
```

- [ ] **Step 2: Create `lib/actions/question-actions.ts`**
Implement `createQuestion`, `fetchRandomQuestion`, and `getQuestionCount`:
```typescript
'use server';

import { supabase } from '@/lib/supabase';
import { ClientQuestion, Question } from '@/lib/types';

export async function createQuestion(params: {
  prompt: string;
  options: string[];
  correctIndex: number;
  category?: string;
  explanation?: string;
  createdBy?: string;
}): Promise<{ success: boolean; question?: Question; error?: string }> {
  try {
    if (!params.prompt?.trim()) {
      return { success: false, error: 'Question prompt is required.' };
    }
    if (!Array.isArray(params.options) || params.options.length !== 4) {
      return { success: false, error: 'Exactly 4 options are required.' };
    }
    if (params.options.some((opt) => !opt?.trim())) {
      return { success: false, error: 'All 4 options must be filled.' };
    }
    if (params.correctIndex < 0 || params.correctIndex > 3) {
      return { success: false, error: 'Correct option must be between 0 and 3.' };
    }

    const newQuestion = {
      prompt: params.prompt.trim(),
      options: params.options.map((o) => o.trim()),
      correct_index: params.correctIndex,
      category: params.category?.trim() || 'General',
      explanation: params.explanation?.trim() || null,
      created_by: params.createdBy?.toLowerCase() || null,
    };

    const { data, error } = await supabase
      .from('questions')
      .insert(newQuestion)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, question: data as Question };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function fetchRandomQuestion(
  excludeIds: string[] = []
): Promise<ClientQuestion | null> {
  try {
    let query = supabase.from('questions').select('id, category, prompt, options');

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    const { data, error } = await query.limit(20);
    if (error || !data || data.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * data.length);
    const row = data[randomIndex];
    return {
      id: row.id,
      category: row.category,
      prompt: row.prompt,
      options: Array.isArray(row.options) ? (row.options as string[]) : [],
    };
  } catch (err) {
    console.error('fetchRandomQuestion error:', err);
    return null;
  }
}

export async function getQuestionCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
```

- [ ] **Step 3: Create `lib/actions/quiz-actions.ts`**
Implement `submitAnswer`, `getUserStats`, and `getQuestionHistory`:
```typescript
'use server';

import { supabase } from '@/lib/supabase';
import { AnswerSubmissionResult, QuizResult, UserStats } from '@/lib/types';

export async function submitAnswer(params: {
  questionId: string;
  answerIndex: number;
  walletAddress: string;
}): Promise<AnswerSubmissionResult> {
  const normalizedWallet = params.walletAddress.toLowerCase();

  try {
    const { data: qData, error: qError } = await supabase
      .from('questions')
      .select('correct_index, explanation')
      .eq('id', params.questionId)
      .single();

    if (qError || !qData) {
      console.error('Question not found for answer submission:', qError);
      return { isCorrect: false, correctIndex: 0, explanation: null };
    }

    const isCorrect = params.answerIndex === qData.correct_index;

    // Log the result
    await supabase.from('quiz_results').insert({
      wallet_address: normalizedWallet,
      question_id: params.questionId,
      answer_index: params.answerIndex,
      is_correct: isCorrect,
    });

    return {
      isCorrect,
      correctIndex: qData.correct_index,
      explanation: qData.explanation,
    };
  } catch (err) {
    console.error('submitAnswer error:', err);
    return { isCorrect: false, correctIndex: 0, explanation: null };
  }
}

export async function getUserStats(walletAddress: string): Promise<UserStats> {
  const normalized = walletAddress.toLowerCase();
  try {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('is_correct, answered_at')
      .eq('wallet_address', normalized)
      .order('answered_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return { score: 0, streak: 0, bestStreak: 0, accuracy: 0, totalAnswered: 0 };
    }

    const totalAnswered = data.length;
    const correctCount = data.filter((r) => r.is_correct).length;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    // Calculate current streak (consecutive correct answers from most recent)
    let streak = 0;
    for (const res of data) {
      if (res.is_correct) streak++;
      else break;
    }

    // Calculate best streak (in chronological order)
    const chronological = [...data].reverse();
    let bestStreak = 0;
    let currentRun = 0;
    for (const res of chronological) {
      if (res.is_correct) {
        currentRun++;
        if (currentRun > bestStreak) bestStreak = currentRun;
      } else {
        currentRun = 0;
      }
    }

    return {
      score: correctCount,
      streak,
      bestStreak,
      accuracy,
      totalAnswered,
    };
  } catch (err) {
    console.error('getUserStats error:', err);
    return { score: 0, streak: 0, bestStreak: 0, accuracy: 0, totalAnswered: 0 };
  }
}

export async function getQuestionHistory(
  walletAddress: string,
  limit: number = 10
): Promise<QuizResult[]> {
  const normalized = walletAddress.toLowerCase();
  try {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('wallet_address', normalized)
      .order('answered_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as QuizResult[];
  } catch (err) {
    console.error('getQuestionHistory error:', err);
    return [];
  }
}
```

- [ ] **Step 4: Create `lib/actions/leaderboard-actions.ts`**
Implement `getGlobalLeaderboard` and `getGroupLeaderboard`:
```typescript
'use server';

import { supabase } from '@/lib/supabase';
import { LeaderboardEntry } from '@/lib/types';

export async function getGlobalLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('wallet_address, is_correct');

    if (error || !data || data.length === 0) return [];

    // Aggregate user scores
    const userMap: Record<string, { correct: number; total: number }> = {};
    for (const r of data) {
      if (!userMap[r.wallet_address]) {
        userMap[r.wallet_address] = { correct: 0, total: 0 };
      }
      userMap[r.wallet_address].total++;
      if (r.is_correct) userMap[r.wallet_address].correct++;
    }

    const sorted = Object.entries(userMap)
      .map(([wallet, stats]) => ({
        wallet_address: wallet,
        display_name: `${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
        score: stats.correct,
        accuracy: Math.round((stats.correct / stats.total) * 100),
        rank: 0,
      }))
      .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy)
      .slice(0, limit)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    return sorted;
  } catch (err) {
    console.error('getGlobalLeaderboard error:', err);
    return [];
  }
}

export async function getGroupLeaderboard(
  groupId: string,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  try {
    // Get group members
    const { data: members, error: mError } = await supabase
      .from('group_members')
      .select('wallet_address')
      .eq('group_id', groupId);

    if (mError || !members || members.length === 0) return [];

    const memberWallets = members.map((m) => m.wallet_address);

    const { data: results, error: rError } = await supabase
      .from('quiz_results')
      .select('wallet_address, is_correct')
      .in('wallet_address', memberWallets);

    if (rError || !results) return [];

    const userMap: Record<string, { correct: number; total: number }> = {};
    for (const wallet of memberWallets) {
      userMap[wallet] = { correct: 0, total: 0 };
    }
    for (const r of results) {
      if (userMap[r.wallet_address]) {
        userMap[r.wallet_address].total++;
        if (r.is_correct) userMap[r.wallet_address].correct++;
      }
    }

    const sorted = Object.entries(userMap)
      .map(([wallet, stats]) => ({
        wallet_address: wallet,
        display_name: `${wallet.slice(0, 6)}...${wallet.slice(-4)}`,
        score: stats.correct,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        rank: 0,
      }))
      .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy)
      .slice(0, limit)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    return sorted;
  } catch (err) {
    console.error('getGroupLeaderboard error:', err);
    return [];
  }
}
```

- [ ] **Step 5: Create `lib/actions/group-actions.ts`**
Implement `createGroup`, `joinGroup`, `leaveGroup`, and `getUserGroups`:
```typescript
'use server';

import { supabase } from '@/lib/supabase';
import { Group } from '@/lib/types';

export async function createGroup(params: {
  name: string;
  description?: string;
  ownerWallet: string;
}): Promise<{ success: boolean; group?: Group; error?: string }> {
  const normalized = params.ownerWallet.toLowerCase();
  try {
    if (!params.name?.trim()) {
      return { success: false, error: 'Group name is required.' };
    }

    const { data: group, error } = await supabase
      .from('groups')
      .insert({
        name: params.name.trim(),
        description: params.description?.trim() || null,
        owner_wallet: normalized,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Automatically add owner as a member
    await supabase.from('group_members').insert({
      group_id: group.id,
      wallet_address: normalized,
    });

    return { success: true, group: group as Group };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function joinGroup(
  groupId: string,
  walletAddress: string
): Promise<{ success: boolean; error?: string }> {
  const normalized = walletAddress.toLowerCase();
  try {
    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      wallet_address: normalized,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function leaveGroup(
  groupId: string,
  walletAddress: string
): Promise<{ success: boolean; error?: string }> {
  const normalized = walletAddress.toLowerCase();
  try {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('wallet_address', normalized);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function getUserGroups(walletAddress: string): Promise<Group[]> {
  const normalized = walletAddress.toLowerCase();
  try {
    const { data, error } = await supabase
      .from('group_members')
      .select('group_id, groups(*)')
      .eq('wallet_address', normalized);

    if (error || !data) return [];
    return data.map((d) => d.groups as unknown as Group).filter(Boolean);
  } catch (err) {
    console.error('getUserGroups error:', err);
    return [];
  }
}
```

- [ ] **Step 6: Verify build and lint**
```bash
npm run lint && npm run build
```
Expected: Exit 0.

- [ ] **Step 7: Commit**
```bash
git add lib/actions/
git commit -m "feat: implement Supabase server actions for users, questions, quiz, and groups"
```

---

### Task 3: Responsive AdZone Component

**Files:**
- Create: `components/AdZone.tsx`

**Interfaces:**
- Produces: `<AdZone variant="skyscraper" | "banner" slot="..." />` component usable anywhere in layout.

- [ ] **Step 1: Create `components/AdZone.tsx`**
```tsx
'use client';

import React from 'react';

interface AdZoneProps {
  variant: 'skyscraper' | 'banner';
  slot: string;
  className?: string;
  children?: React.ReactNode;
}

export default function AdZone({ variant, slot, className = '', children }: AdZoneProps) {
  if (variant === 'skyscraper') {
    return (
      <aside
        data-slot={slot}
        className={`hidden xl:flex flex-col w-[160px] shrink-0 sticky top-20 self-start p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-lg text-center backdrop-blur-sm transition-all hover:border-slate-600 ${className}`}
        aria-label="Sponsored Promotions"
      >
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 py-0.5 px-2 bg-slate-900/60 rounded-full inline-block mx-auto border border-slate-700/40">
          Sponsored
        </div>
        {children || (
          <div className="flex flex-col items-center justify-center min-h-[500px] border border-dashed border-slate-700 rounded-lg p-2 text-slate-500 text-xs">
            <span className="text-2xl mb-2">⚡</span>
            <span className="font-medium text-slate-300">Hot Dev Deals</span>
            <span className="text-[11px] text-slate-400 mt-1">Tools & Cloud Offers</span>
            <a
              href="https://www.profitableratecpmnetwork.com/pvr8jzwqk?key=7672ccaa0ae9cd3ce4f5fd168d596fde"
              target="_blank"
              rel="noopener sponsored"
              className="mt-4 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[11px] font-medium transition-colors"
            >
              Claim Offer →
            </a>
          </div>
        )}
      </aside>
    );
  }

  // Horizontal Banner (fits any width, mobile to desktop)
  return (
    <section
      data-slot={slot}
      className={`w-full my-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-md backdrop-blur-sm transition-all hover:border-slate-600 ${className}`}
      aria-label="Sponsored Banner"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-0.5 px-2 bg-slate-900/60 rounded-full border border-slate-700/40">
          Sponsored
        </span>
      </div>
      {children || (
        <a
          href="https://www.profitableratecpmnetwork.com/pvr8jzwqk?key=7672ccaa0ae9cd3ce4f5fd168d596fde"
          target="_blank"
          rel="noopener sponsored"
          className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900/80 border border-slate-700/40 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl group-hover:scale-110 transition-transform">🚀</span>
            <div>
              <p className="text-sm font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                Recommended Dev Tools & Cloud Infrastructure
              </p>
              <p className="text-xs text-slate-400">
                Explore curated developer resources, high-performance hosting & exclusive discounts.
              </p>
            </div>
          </div>
          <span className="text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-600/20 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0 ml-4">
            Learn More →
          </span>
        </a>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify build and lint**
```bash
npm run lint && npm run build
```
Expected: Exit 0.

- [ ] **Step 3: Commit**
```bash
git add components/AdZone.tsx
git commit -m "feat: add responsive AdZone component for skyscraper and banner ads"
```

---

### Task 4: Base Modal & Dialog Modals

**Files:**
- Create: `components/Modal.tsx`
- Create: `components/modals/IntroModal.tsx`
- Create: `components/modals/TimerSettingsModal.tsx`
- Create: `components/modals/GroupModal.tsx`
- Create: `components/modals/ReviewModal.tsx`

**Interfaces:**
- Produces: Base reusable `Modal` wrapper and 4 dialog modals rendered via React portals.

- [ ] **Step 1: Create `components/Modal.tsx`**
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  maxWidth = 'max-w-md',
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className={`relative w-full ${maxWidth} bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-10 max-h-[90vh]`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60 bg-slate-850">
              <div className="flex items-center gap-2.5">
                {icon && <span className="text-xl">{icon}</span>}
                <h2 className="text-lg font-bold text-white">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-slate-700/60 bg-slate-900/40 flex justify-end gap-3">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
```

- [ ] **Step 2: Create `components/modals/IntroModal.tsx`**
3-step walkthrough introducing how to add questions, build quiz sets, and play.
```tsx
'use client';

import React, { useState } from 'react';
import Modal from '@/components/Modal';

interface IntroModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IntroModal({ isOpen, onClose }: IntroModalProps) {
  const [step, setStep] = useState(1);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      setStep(1);
      onClose();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How to Create & Play"
      icon="💡"
      footer={
        <div className="flex w-full items-center justify-between">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
            >
              ← Back
            </button>
          ) : <div />}
          <button
            onClick={handleNext}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            {step === 3 ? "Let's Go! 🚀" : 'Next Step →'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {step === 1 && (
          <div className="text-center py-2 space-y-3">
            <div className="text-4xl mb-2">✍️</div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-full">
              Step 1 of 3
            </span>
            <h3 className="text-lg font-bold text-white">Create Your Questions</h3>
            <p className="text-sm text-slate-300">
              Click <strong>&quot;Add Custom Question&quot;</strong> to enter your question text, 4 options, and select the radio button next to the correct answer.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="text-center py-2 space-y-3">
            <div className="text-4xl mb-2">📦</div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-purple-500/20 text-purple-400 rounded-full">
              Step 2 of 3
            </span>
            <h3 className="text-lg font-bold text-white">Build Your Trivia Pool</h3>
            <p className="text-sm text-slate-300">
              Every question you add is stored securely in Supabase. Your questions become playable by everyone in the community!
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-2 space-y-3">
            <div className="text-4xl mb-2">🎯</div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">
              Step 3 of 3
            </span>
            <h3 className="text-lg font-bold text-white">Play & Climb Ranks</h3>
            <p className="text-sm text-slate-300">
              Use keys <strong>1–4</strong> or <strong>A–D</strong> to answer. Enjoy live streak tracking, accuracy stats, and compete for top ranks on the Global and Group Leaderboards!
            </p>
          </div>
        )}

        {/* Step dots */}
        <div className="flex justify-center gap-2 pt-4">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                step === s ? 'bg-blue-500 w-6' : 'bg-slate-600 hover:bg-slate-500'
              }`}
              aria-label={`Step ${s}`}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Create `components/modals/TimerSettingsModal.tsx`**
Allows configuring timer mode (per-question, total, stopwatch) and presets.
```tsx
'use client';

import React, { useState } from 'react';
import Modal from '@/components/Modal';

interface TimerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: 'per-question' | 'total' | 'stopwatch';
  currentDuration: number;
  onSave: (mode: 'per-question' | 'total' | 'stopwatch', duration: number) => void;
}

export default function TimerSettingsModal({
  isOpen,
  onClose,
  currentMode,
  currentDuration,
  onSave,
}: TimerSettingsModalProps) {
  const [mode, setMode] = useState(currentMode);
  const [duration, setDuration] = useState(currentDuration);

  const presets = [15, 30, 60, 120];

  const handleSave = () => {
    onSave(mode, duration);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Timer & Clock Settings"
      icon="⏱️"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            Save Settings
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Timer Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'per-question' | 'total' | 'stopwatch')}
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="per-question">Per-Question Countdown</option>
            <option value="total">Total Quiz Countdown</option>
            <option value="stopwatch">Stopwatch (Count Up)</option>
          </select>
        </div>

        {mode !== 'stopwatch' && (
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Time Limit (Seconds)
            </label>
            <div className="flex gap-2 mb-3">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDuration(p)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    duration === p
                      ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {p < 60 ? `${p}s` : `${p / 60}m`}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="5"
              max="600"
              value={duration}
              onChange={(e) => setDuration(Math.max(5, parseInt(e.target.value) || 30))}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Create `components/modals/GroupModal.tsx`**
Supports creating groups, joining existing groups, and viewing joined groups.
```tsx
'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { Group } from '@/lib/types';
import { createGroup, joinGroup, leaveGroup, getUserGroups } from '@/lib/actions/group-actions';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string | null;
  onSelectGroup?: (groupId: string) => void;
}

export default function GroupModal({
  isOpen,
  onClose,
  walletAddress,
  onSelectGroup,
}: GroupModalProps) {
  const [tab, setTab] = useState<'my' | 'create' | 'join'>('my');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Form states
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [joinId, setJoinId] = useState('');

  useEffect(() => {
    if (isOpen && walletAddress) {
      loadGroups();
    }
  }, [isOpen, walletAddress]);

  const loadGroups = async () => {
    if (!walletAddress) return;
    setLoading(true);
    const list = await getUserGroups(walletAddress);
    setGroups(list);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      setMessage({ type: 'error', text: 'Please connect your wallet first.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    const res = await createGroup({
      name: groupName,
      description: groupDesc,
      ownerWallet: walletAddress,
    });
    setLoading(false);
    if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Failed to create group' });
    } else {
      setMessage({ type: 'success', text: `Group "${res.group?.name}" created!` });
      setGroupName('');
      setGroupDesc('');
      loadGroups();
      setTab('my');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      setMessage({ type: 'error', text: 'Please connect your wallet first.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    const res = await joinGroup(joinId.trim(), walletAddress);
    setLoading(false);
    if (!res.success) {
      setMessage({ type: 'error', text: res.error || 'Failed to join group' });
    } else {
      setMessage({ type: 'success', text: 'Successfully joined group!' });
      setJoinId('');
      loadGroups();
      setTab('my');
    }
  };

  const handleLeave = async (groupId: string) => {
    if (!walletAddress) return;
    await leaveGroup(groupId, walletAddress);
    loadGroups();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Groups & Guilds" icon="🛡️" maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-700 gap-2">
          <button
            onClick={() => { setTab('my'); setMessage(null); }}
            className={`pb-2 px-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'my'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            My Groups ({groups.length})
          </button>
          <button
            onClick={() => { setTab('create'); setMessage(null); }}
            className={`pb-2 px-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'create'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Group
          </button>
          <button
            onClick={() => { setTab('join'); setMessage(null); }}
            className={`pb-2 px-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'join'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Join Group
          </button>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-3 rounded-lg text-xs font-medium ${
              message.type === 'error'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tab 1: My Groups */}
        {tab === 'my' && (
          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-slate-400 text-center py-4">Loading groups...</p>
            ) : groups.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                You haven&apos;t joined any groups yet. Create or join one below!
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-semibold text-white text-sm">{g.name}</h4>
                      {g.description && (
                        <p className="text-xs text-slate-400 line-clamp-1">{g.description}</p>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono">ID: {g.id}</span>
                    </div>
                    <div className="flex gap-2">
                      {onSelectGroup && (
                        <button
                          onClick={() => {
                            onSelectGroup(g.id);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white rounded text-xs font-medium transition-colors"
                        >
                          View Board
                        </button>
                      )}
                      <button
                        onClick={() => handleLeave(g.id)}
                        className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded text-xs font-medium transition-colors"
                      >
                        Leave
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Create Group */}
        {tab === 'create' && (
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Group Name *</label>
              <input
                type="text"
                required
                maxLength={40}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Web3 Titans"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
              <textarea
                maxLength={200}
                rows={2}
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                placeholder="What is this guild about?"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </form>
        )}

        {/* Tab 3: Join Group */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Group ID (UUID) *</label>
              <input
                type="text"
                required
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Paste group UUID here..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              {loading ? 'Joining...' : 'Join Group'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 5: Create `components/modals/ReviewModal.tsx`**
Detailed breakdown of answered questions in the session.
```tsx
'use client';

import React from 'react';
import Modal from '@/components/Modal';

export interface HistoryItem {
  questionId: string;
  prompt: string;
  isCorrect: boolean;
}

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
}

export default function ReviewModal({ isOpen, onClose, history }: ReviewModalProps) {
  const correctCount = history.filter((h) => h.isCorrect).length;
  const accuracy = history.length > 0 ? Math.round((correctCount / history.length) * 100) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Session Breakdown"
      icon="📋"
      maxWidth="max-w-lg"
      footer={
        <button
          onClick={onClose}
          className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          Back to Quiz
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
          <div>
            <span className="text-xs text-slate-400">Total Answered</span>
            <p className="text-lg font-bold text-white">{history.length}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Correct</span>
            <p className="text-lg font-bold text-emerald-400">{correctCount}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Accuracy</span>
            <p className="text-lg font-bold text-blue-400">{accuracy}%</p>
          </div>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {history.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No questions answered yet.</p>
          ) : (
            history.map((item, idx) => (
              <div
                key={`${item.questionId}-${idx}`}
                className={`p-3 rounded-lg border flex items-start gap-3 ${
                  item.isCorrect
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                    : 'bg-red-950/20 border-red-800/40 text-red-200'
                }`}
              >
                <span className="text-lg mt-0.5">{item.isCorrect ? '✅' : '❌'}</span>
                <div className="flex-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Q{idx + 1}
                  </span>
                  <p className="text-xs font-medium text-slate-200 line-clamp-2">{item.prompt}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 6: Verify build and lint**
```bash
npm run lint && npm run build
```
Expected: Exit 0.

- [ ] **Step 7: Commit**
```bash
git add components/Modal.tsx components/modals/
git commit -m "feat: add modal portal architecture and Intro, Timer, Group, and Review modals"
```

---

### Task 5: Custom Question Form Component

**Files:**
- Create: `components/QuestionForm.tsx`

**Interfaces:**
- Consumes: `createQuestion` from `lib/actions/question-actions.ts`
- Produces: Collapsible question creator accordion with 4 options and radio selector.

- [ ] **Step 1: Create `components/QuestionForm.tsx`**
```tsx
'use client';

import React, { useState } from 'react';
import { createQuestion } from '@/lib/actions/question-actions';
import { ChevronDown, ChevronUp, Plus, Sparkles } from 'lucide-react';

interface QuestionFormProps {
  walletAddress: string | null;
  onQuestionAdded?: () => void;
}

export default function QuestionForm({ walletAddress, onQuestionAdded }: QuestionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [category, setCategory] = useState('Web Dev');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(
    null
  );

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!prompt.trim()) {
      setFeedback({ type: 'error', message: 'Question prompt is required.' });
      return;
    }
    if (options.some((opt) => !opt.trim())) {
      setFeedback({ type: 'error', message: 'All 4 options must be filled.' });
      return;
    }

    setLoading(true);
    const res = await createQuestion({
      prompt,
      options,
      correctIndex,
      category,
      explanation,
      createdBy: walletAddress || undefined,
    });
    setLoading(false);

    if (!res.success) {
      setFeedback({ type: 'error', message: res.error || 'Failed to add question.' });
    } else {
      setFeedback({ type: 'success', message: 'Question added successfully! 🎉' });
      setPrompt('');
      setOptions(['', '', '', '']);
      setExplanation('');
      setCorrectIndex(0);
      if (onQuestionAdded) onQuestionAdded();
    }
  };

  return (
    <section className="w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm my-4">
      {/* Header bar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 px-6 text-left hover:bg-slate-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
            <Plus className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-white text-base">Add Custom Question</h3>
            <p className="text-xs text-slate-400">Contribute new trivia to the global database</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-700 text-slate-300 rounded-full">
            {isOpen ? 'Close' : 'Expand'}
          </span>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Collapsible Form Body */}
      {isOpen && (
        <form onSubmit={handleSubmit} className="p-6 pt-2 border-t border-slate-700/60 space-y-4">
          {feedback && (
            <div
              className={`p-3 rounded-lg text-xs font-medium ${
                feedback.type === 'error'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Prompt */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Question Prompt <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={250}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. What does CSS stand for?"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
            />
          </div>

          {/* Options with radio button for correct option */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Answer Options <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] text-slate-400">Radio button selects correct answer</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {['A', 'B', 'C', 'D'].map((letter, idx) => (
                <div
                  key={letter}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                    correctIndex === idx
                      ? 'bg-blue-950/40 border-blue-500'
                      : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="correct-option"
                      checked={correctIndex === idx}
                      onChange={() => setCorrectIndex(idx)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-600 cursor-pointer"
                    />
                    <span className="font-bold text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {letter}
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={options[idx]}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${letter}`}
                    className="flex-1 bg-transparent border-none text-white text-xs focus:outline-none placeholder:text-slate-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Category & Explanation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category / Topic
              </label>
              <input
                type="text"
                list="topics-list"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Web Dev, Crypto, General..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="topics-list">
                <option value="Web Dev" />
                <option value="JavaScript" />
                <option value="Crypto & Web3" />
                <option value="Python" />
                <option value="General" />
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Explanation (Optional)
              </label>
              <input
                type="text"
                maxLength={300}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="e.g. Cascading Style Sheets format web pages."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold text-xs shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Saving Question...' : 'Submit Question'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify build and lint**
```bash
npm run lint && npm run build
```
Expected: Exit 0.

- [ ] **Step 3: Commit**
```bash
git add components/QuestionForm.tsx
git commit -m "feat: add collapsible QuestionForm component for custom trivia creation"
```

---

### Task 6: 3D Flip Quiz Card Components

**Files:**
- Modify: `app/globals.css` (add 3D transform utilities)
- Create: `components/QuestionFront.tsx`
- Create: `components/AnswerBack.tsx`
- Create: `components/QuizCard.tsx`

**Interfaces:**
- Consumes: `ClientQuestion`, `AnswerSubmissionResult`, `canvas-confetti`
- Produces: 3D flipping interactive quiz card with keyboard controls, timer, powerups, and celebration confetti.

- [ ] **Step 1: Add 3D transform utility styles in `app/globals.css`**
Append to `app/globals.css`:
```css
/* 3D Flip Card Utilities */
.perspective-1000 {
  perspective: 1000px;
}
.transform-style-3d {
  transform-style: preserve-3d;
}
.backface-hidden {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.rotate-y-180 {
  transform: rotateY(180deg);
}
```

- [ ] **Step 2: Create `components/QuestionFront.tsx`**
Front face of card: category, timer display, power-ups toolbar (50:50, Skip), question prompt, and options grid (accessible with keys 1-4 / A-D).
```tsx
'use client';

import React, { useEffect } from 'react';
import { ClientQuestion } from '@/lib/types';
import { Timer, Settings2 } from 'lucide-react';

interface QuestionFrontProps {
  question: ClientQuestion;
  timeLeft: number;
  onSelectAnswer: (index: number) => void;
  onOpenTimerSettings: () => void;
  onUse5050: () => void;
  onUseSkip: () => void;
  fiftyFiftyUsed: boolean;
  skipUsed: boolean;
  eliminatedIndices: number[];
  isSubmitting: boolean;
}

export default function QuestionFront({
  question,
  timeLeft,
  onSelectAnswer,
  onOpenTimerSettings,
  onUse5050,
  onUseSkip,
  fiftyFiftyUsed,
  skipUsed,
  eliminatedIndices,
  isSubmitting,
}: QuestionFrontProps) {
  // Keyboard navigation: 1-4 or A-D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitting) return;
      const key = e.key.toUpperCase();
      let index = -1;
      if (key === '1' || key === 'A') index = 0;
      if (key === '2' || key === 'B') index = 1;
      if (key === '3' || key === 'C') index = 2;
      if (key === '4' || key === 'D') index = 3;

      if (index >= 0 && index < 4 && !eliminatedIndices.includes(index)) {
        onSelectAnswer(index);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, eliminatedIndices, onSelectAnswer]);

  return (
    <div className="flex flex-col h-full justify-between p-6 sm:p-8 bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl">
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-semibold tracking-wide uppercase">
          {question.category || 'Trivia'}
        </span>

        {/* Timer Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-700/80 rounded-full">
          <Timer className="w-3.5 h-3.5 text-blue-400" />
          <span
            className={`font-mono text-xs font-bold ${
              timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-slate-200'
            }`}
          >
            {Math.floor(timeLeft / 60)
              .toString()
              .padStart(2, '0')}
            :{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={onOpenTimerSettings}
            className="text-slate-400 hover:text-white ml-1 transition-colors"
            title="Timer Settings"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Power-ups */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={fiftyFiftyUsed || isSubmitting}
            onClick={onUse5050}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-900/70 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-900/70 transition-all"
            title="Eliminate 2 wrong options"
          >
            ✂️ 50:50
          </button>
          <button
            type="button"
            disabled={skipUsed || isSubmitting}
            onClick={onUseSkip}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-900/70 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-900/70 transition-all"
            title="Skip this question"
          >
            ⏭️ Skip
          </button>
        </div>
      </div>

      {/* Question Heading */}
      <div className="my-6 text-center">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-relaxed">
          {question.prompt}
        </h2>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto" role="group" aria-label="Answer options">
        {question.options.map((opt, idx) => {
          const isEliminated = eliminatedIndices.includes(idx);
          const letter = ['A', 'B', 'C', 'D'][idx];
          return (
            <button
              key={idx}
              disabled={isEliminated || isSubmitting}
              onClick={() => onSelectAnswer(idx)}
              className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all group ${
                isEliminated
                  ? 'opacity-25 bg-slate-900 border-slate-800 cursor-not-allowed'
                  : 'bg-slate-900/70 border-slate-700 hover:border-blue-500 hover:bg-slate-750 hover:shadow-md cursor-pointer'
              }`}
            >
              <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-colors shrink-0">
                {letter}
              </span>
              <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `components/AnswerBack.tsx`**
Back face of card: result feedback (correct/wrong banner), explanation text, correct answer highlight, and "Next Question" button.
```tsx
'use client';

import React, { useEffect } from 'react';
import { AnswerSubmissionResult, ClientQuestion } from '@/lib/types';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

interface AnswerBackProps {
  question: ClientQuestion;
  result: AnswerSubmissionResult;
  onNext: () => void;
}

export default function AnswerBack({ question, result, onNext }: AnswerBackProps) {
  const letters = ['A', 'B', 'C', 'D'];

  // Advance to next question on Enter or Space
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext]);

  return (
    <div className="flex flex-col h-full justify-between p-6 sm:p-8 bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl">
      {/* Top Banner */}
      <div
        className={`flex items-center gap-3 p-4 rounded-2xl border ${
          result.isCorrect
            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
            : 'bg-red-950/40 border-red-500/50 text-red-300'
        }`}
      >
        {result.isCorrect ? (
          <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
        ) : (
          <XCircle className="w-8 h-8 text-red-400 shrink-0" />
        )}
        <div>
          <h3 className="text-lg font-bold">
            {result.isCorrect ? 'Correct! Well Done! 🎉' : 'Incorrect! Better Luck Next Time.'}
          </h3>
          <p className="text-xs opacity-80">
            {result.isCorrect ? '+1 Score point added' : 'Streak reset to 0'}
          </p>
        </div>
      </div>

      {/* Answer & Explanation Box */}
      <div className="my-6 p-5 rounded-2xl bg-slate-900/80 border border-slate-700/80 space-y-3">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Correct Answer:
          </span>
          <p className="text-base font-bold text-blue-400 mt-0.5">
            {letters[result.correctIndex]}: {question.options[result.correctIndex]}
          </p>
        </div>

        {result.explanation && (
          <div className="pt-3 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Explanation:
            </span>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {result.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Next Button Footer */}
      <div className="pt-4 border-t border-slate-700/60 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-blue-500/25 transition-all cursor-pointer group"
        >
          <span>Next Question</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `components/QuizCard.tsx`**
Combines front and back faces with 3D flip transform and confetti trigger.
```tsx
'use client';

import React from 'react';
import confetti from 'canvas-confetti';
import { AnswerSubmissionResult, ClientQuestion } from '@/lib/types';
import QuestionFront from './QuestionFront';
import AnswerBack from './AnswerBack';

interface QuizCardProps {
  question: ClientQuestion | null;
  isFlipped: boolean;
  timeLeft: number;
  result: AnswerSubmissionResult | null;
  onSelectAnswer: (index: number) => void;
  onNextQuestion: () => void;
  onOpenTimerSettings: () => void;
  onUse5050: () => void;
  onUseSkip: () => void;
  fiftyFiftyUsed: boolean;
  skipUsed: boolean;
  eliminatedIndices: number[];
  isSubmitting: boolean;
  onAddQuestionClick: () => void;
}

export default function QuizCard({
  question,
  isFlipped,
  timeLeft,
  result,
  onSelectAnswer,
  onNextQuestion,
  onOpenTimerSettings,
  onUse5050,
  onUseSkip,
  fiftyFiftyUsed,
  skipUsed,
  eliminatedIndices,
  isSubmitting,
  onAddQuestionClick,
}: QuizCardProps) {
  // Fire confetti if result is correct
  React.useEffect(() => {
    if (isFlipped && result?.isCorrect) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899'],
      });
    }
  }, [isFlipped, result]);

  // Empty state when no question is available
  if (!question) {
    return (
      <div className="w-full min-h-[420px] flex flex-col items-center justify-center p-8 bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl text-center">
        <div className="text-5xl mb-4">🚀</div>
        <h2 className="text-2xl font-bold text-white mb-2">No Quiz Questions Yet</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Be the first to contribute! Add your own custom questions to kick off the trivia session.
        </p>
        <button
          type="button"
          onClick={onAddQuestionClick}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all"
        >
          ➕ Add First Question
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[460px] perspective-1000">
      <div
        className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front Face */}
        <div className="absolute inset-0 w-full h-full backface-hidden">
          <QuestionFront
            question={question}
            timeLeft={timeLeft}
            onSelectAnswer={onSelectAnswer}
            onOpenTimerSettings={onOpenTimerSettings}
            onUse5050={onUse5050}
            onUseSkip={onUseSkip}
            fiftyFiftyUsed={fiftyFiftyUsed}
            skipUsed={skipUsed}
            eliminatedIndices={eliminatedIndices}
            isSubmitting={isSubmitting}
          />
        </div>

        {/* Back Face */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
          {result && (
            <AnswerBack
              question={question}
              result={result}
              onNext={onNextQuestion}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify build and lint**
```bash
npm run lint && npm run build
```
Expected: Exit 0.

- [ ] **Step 6: Commit**
```bash
git add app/globals.css components/QuestionFront.tsx components/AnswerBack.tsx components/QuizCard.tsx
git commit -m "feat: implement 3D flip QuizCard with QuestionFront, AnswerBack, and confetti effects"
```

---

### Task 7: Sidebar & Leaderboard Panels

**Files:**
- Create: `components/StatsPanel.tsx`
- Create: `components/HistoryList.tsx`
- Create: `components/Sidebar.tsx`
- Create: `components/GlobalLeaderboard.tsx`
- Create: `components/GroupLeaderboard.tsx`
- Create: `components/LeaderboardPanel.tsx`

**Interfaces:**
- Consumes: `UserStats`, `LeaderboardEntry`, `QuizResult`
- Produces: Sidebar (stats + history) and LeaderboardPanel (Global vs Group rankings).

- [ ] **Step 1: Create `components/StatsPanel.tsx`**
Displays total score, current streak, best streak, and accuracy %.
```tsx
'use client';

import React from 'react';
import { UserStats } from '@/lib/types';
import { Flame, Trophy, Target } from 'lucide-react';

interface StatsPanelProps {
  stats: UserStats;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {/* Total Score */}
      <div className="p-3 bg-slate-900/70 border border-slate-700/80 rounded-xl flex flex-col items-center justify-center text-center">
        <Trophy className="w-4 h-4 text-amber-400 mb-1" />
        <span className="text-[10px] uppercase font-semibold text-slate-400">Score</span>
        <span className="text-lg font-bold text-white">{stats.score}</span>
        <span className="text-[10px] text-slate-500">pts</span>
      </div>

      {/* Streak */}
      <div className="p-3 bg-slate-900/70 border border-slate-700/80 rounded-xl flex flex-col items-center justify-center text-center">
        <Flame className="w-4 h-4 text-orange-500 mb-1" />
        <span className="text-[10px] uppercase font-semibold text-slate-400">Streak</span>
        <span className="text-lg font-bold text-orange-400">{stats.streak}</span>
        <span className="text-[10px] text-slate-500">Best: {stats.bestStreak}</span>
      </div>

      {/* Accuracy */}
      <div className="p-3 bg-slate-900/70 border border-slate-700/80 rounded-xl flex flex-col items-center justify-center text-center">
        <Target className="w-4 h-4 text-blue-400 mb-1" />
        <span className="text-[10px] uppercase font-semibold text-slate-400">Accuracy</span>
        <span className="text-lg font-bold text-blue-400">{stats.accuracy}%</span>
        <span className="text-[10px] text-slate-500">{stats.totalAnswered} total</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/HistoryList.tsx`**
Recent questions answered in this session.
```tsx
'use client';

import React from 'react';
import { HistoryItem } from './modals/ReviewModal';

interface HistoryListProps {
  history: HistoryItem[];
  onOpenReview: () => void;
}

export default function HistoryList({ history, onOpenReview }: HistoryListProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Recent History
        </h4>
        {history.length > 0 && (
          <button
            onClick={onOpenReview}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold transition-colors"
          >
            Review All →
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-2">No answered questions yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {history.slice(0, 6).map((item, idx) => (
            <div
              key={`${item.questionId}-${idx}`}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
            >
              <span className="truncate max-w-[150px] text-slate-300 font-medium">
                {item.prompt}
              </span>
              <span className="text-xs">{item.isCorrect ? '✅' : '❌'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `components/Sidebar.tsx`**
Sidebar combining live stats and history.
```tsx
'use client';

import React from 'react';
import { UserStats } from '@/lib/types';
import StatsPanel from './StatsPanel';
import HistoryList from './HistoryList';
import { HistoryItem } from './modals/ReviewModal';

interface SidebarProps {
  stats: UserStats;
  history: HistoryItem[];
  onOpenReview: () => void;
  className?: string;
}

export default function Sidebar({ stats, history, onOpenReview, className = '' }: SidebarProps) {
  return (
    <aside
      className={`p-5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl backdrop-blur-sm space-y-5 ${className}`}
      aria-label="Scoreboard and Stats"
    >
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <span>📊</span> Live Scoreboard
      </h3>
      <StatsPanel stats={stats} />
      <div className="pt-2 border-t border-slate-700/60">
        <HistoryList history={history} onOpenReview={onOpenReview} />
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Create `components/GlobalLeaderboard.tsx`**
Table displaying top quiz users globally.
```tsx
'use client';

import React from 'react';
import { LeaderboardEntry } from '@/lib/types';

interface GlobalLeaderboardProps {
  entries: LeaderboardEntry[];
  loading: boolean;
}

export default function GlobalLeaderboard({ entries, loading }: GlobalLeaderboardProps) {
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

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => {
        const medal =
          entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`;
        return (
          <div
            key={entry.wallet_address}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors text-xs"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 text-center font-bold text-slate-400">{medal}</span>
              <div>
                <span className="font-semibold text-slate-200">
                  {entry.display_name || entry.wallet_address.slice(0, 10)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">{entry.accuracy}% acc</span>
              <span className="font-bold text-blue-400">{entry.score} pts</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Create `components/GroupLeaderboard.tsx`**
Renders rankings for selected group.
```tsx
'use client';

import React from 'react';
import { LeaderboardEntry } from '@/lib/types';

interface GroupLeaderboardProps {
  entries: LeaderboardEntry[];
  loading: boolean;
  onOpenGroupModal: () => void;
}

export default function GroupLeaderboard({
  entries,
  loading,
  onOpenGroupModal,
}: GroupLeaderboardProps) {
  if (loading) {
    return <p className="text-xs text-slate-400 text-center py-6">Loading group ranking...</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-xs text-slate-400">No member activity recorded yet for this group.</p>
        <button
          onClick={onOpenGroupModal}
          className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
        >
          Manage Groups
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => (
        <div
          key={entry.wallet_address}
          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">#{entry.rank}</span>
            <span className="font-semibold text-slate-200">
              {entry.display_name || entry.wallet_address.slice(0, 10)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">{entry.accuracy}%</span>
            <span className="font-bold text-purple-400">{entry.score} pts</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create `components/LeaderboardPanel.tsx`**
Combines Global and Group tabs with trigger to open GroupModal.
```tsx
'use client';

import React, { useState } from 'react';
import { LeaderboardEntry } from '@/lib/types';
import GlobalLeaderboard from './GlobalLeaderboard';
import GroupLeaderboard from './GroupLeaderboard';
import { Shield } from 'lucide-react';

interface LeaderboardPanelProps {
  globalEntries: LeaderboardEntry[];
  groupEntries: LeaderboardEntry[];
  loading: boolean;
  onOpenGroupModal: () => void;
  className?: string;
}

export default function LeaderboardPanel({
  globalEntries,
  groupEntries,
  loading,
  onOpenGroupModal,
  className = '',
}: LeaderboardPanelProps) {
  const [activeTab, setActiveTab] = useState<'global' | 'group'>('global');

  return (
    <section
      className={`p-5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-xl backdrop-blur-sm space-y-4 ${className}`}
      aria-label="Leaderboards"
    >
      <div className="flex items-center justify-between border-b border-slate-700 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('global')}
            className={`text-xs font-bold pb-1 border-b-2 transition-colors ${
              activeTab === 'global'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🏆 Global Top
          </button>
          <button
            onClick={() => setActiveTab('group')}
            className={`text-xs font-bold pb-1 border-b-2 transition-colors ${
              activeTab === 'group'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🛡️ Group Guild
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenGroupModal}
          className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="Create or Join Groups"
        >
          <Shield className="w-3.5 h-3.5" />
        </button>
      </div>

      {activeTab === 'global' ? (
        <GlobalLeaderboard entries={globalEntries} loading={loading} />
      ) : (
        <GroupLeaderboard
          entries={groupEntries}
          loading={loading}
          onOpenGroupModal={onOpenGroupModal}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 7: Verify build and lint**
```bash
npm run lint && npm run build
```
Expected: Exit 0.

- [ ] **Step 8: Commit**
```bash
git add components/StatsPanel.tsx components/HistoryList.tsx components/Sidebar.tsx components/GlobalLeaderboard.tsx components/GroupLeaderboard.tsx components/LeaderboardPanel.tsx
git commit -m "feat: add live stats Sidebar and Global/Group LeaderboardPanel components"
```

---

### Task 8: Quiz Layout State Manager & Home Page Integration

**Files:**
- Create: `components/QuizLayout.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: All components from Tasks 3–7 and Server Actions from Task 2.
- Produces: The complete interactive Quick Quiz app rendered on `app/page.tsx`.

- [ ] **Step 1: Create `components/QuizLayout.tsx`**
Main client controller managing full state, timer countdown, server action round-trips, and modal toggles.
```tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import {
  AnswerSubmissionResult,
  ClientQuestion,
  LeaderboardEntry,
  UserStats,
} from '@/lib/types';
import { getOrCreateUser } from '@/lib/actions/user-actions';
import { fetchRandomQuestion } from '@/lib/actions/question-actions';
import { getUserStats, submitAnswer } from '@/lib/actions/quiz-actions';
import {
  getGlobalLeaderboard,
  getGroupLeaderboard,
} from '@/lib/actions/leaderboard-actions';
import QuizCard from './QuizCard';
import Sidebar from './Sidebar';
import LeaderboardPanel from './LeaderboardPanel';
import QuestionForm from './QuestionForm';
import AdZone from './AdZone';
import IntroModal from './modals/IntroModal';
import TimerSettingsModal from './modals/TimerSettingsModal';
import GroupModal from './modals/GroupModal';
import ReviewModal, { HistoryItem } from './modals/ReviewModal';

export default function QuizLayout() {
  const { address, isConnected } = useAccount();

  // Quiz state
  const [currentQuestion, setCurrentQuestion] = useState<ClientQuestion | null>(null);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerSubmissionResult | null>(null);

  // Stats & History
  const [stats, setStats] = useState<UserStats>({
    score: 0,
    streak: 0,
    bestStreak: 0,
    accuracy: 0,
    totalAnswered: 0,
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Timer settings
  const [timerMode, setTimerMode] = useState<'per-question' | 'total' | 'stopwatch'>('per-question');
  const [timerDuration, setTimerDuration] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);

  // Powerups (once per quiz session)
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(false);
  const [skipUsed, setSkipUsed] = useState(false);
  const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);

  // Leaderboard data
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [groupLeaderboard, setGroupLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Modals
  const [activeModal, setActiveModal] = useState<
    'intro' | 'timer' | 'group' | 'review' | null
  >(null);

  // Initial user sync & stats fetch
  useEffect(() => {
    if (isConnected && address) {
      getOrCreateUser(address).then(() => {
        refreshStats();
      });
    }
  }, [isConnected, address]);

  // Load initial question and leaderboards
  useEffect(() => {
    loadNextQuestion();
    loadLeaderboards();
  }, []);

  const refreshStats = async () => {
    if (!address) return;
    const userStats = await getUserStats(address);
    setStats(userStats);
  };

  const loadLeaderboards = async () => {
    setLeaderboardLoading(true);
    const global = await getGlobalLeaderboard(10);
    setGlobalLeaderboard(global);
    if (selectedGroupId) {
      const group = await getGroupLeaderboard(selectedGroupId, 10);
      setGroupLeaderboard(group);
    }
    setLeaderboardLoading(false);
  };

  const loadNextQuestion = async () => {
    setIsFlipped(false);
    setResult(null);
    setEliminatedIndices([]);
    setTimeLeft(timerDuration);

    const q = await fetchRandomQuestion(answeredIds);
    setCurrentQuestion(q);
  };

  // Timer Countdown effect
  useEffect(() => {
    if (!currentQuestion || isFlipped || isSubmitting) return;

    if (timerMode === 'per-question') {
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleAnswerSubmit(-1); // Timeout treated as wrong
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentQuestion, isFlipped, isSubmitting, timerMode]);

  const handleAnswerSubmit = useCallback(
    async (answerIndex: number) => {
      if (!currentQuestion || isSubmitting || isFlipped) return;

      setIsSubmitting(true);
      const res = await submitAnswer({
        questionId: currentQuestion.id,
        answerIndex,
        walletAddress: address || '0x0000000000000000000000000000000000000000',
      });

      setResult(res);
      setIsFlipped(true);
      setIsSubmitting(false);

      // Record to history and answered IDs
      setAnsweredIds((prev) => [...prev, currentQuestion.id]);
      setHistory((prev) => [
        {
          questionId: currentQuestion.id,
          prompt: currentQuestion.prompt,
          isCorrect: res.isCorrect,
        },
        ...prev,
      ]);

      // Optimistically update local session stats
      setStats((prev) => {
        const nextTotal = prev.totalAnswered + 1;
        const nextScore = res.isCorrect ? prev.score + 1 : prev.score;
        const nextStreak = res.isCorrect ? prev.streak + 1 : 0;
        const nextBest = Math.max(prev.bestStreak, nextStreak);
        const nextAcc = Math.round((nextScore / nextTotal) * 100);
        return {
          score: nextScore,
          streak: nextStreak,
          bestStreak: nextBest,
          accuracy: nextAcc,
          totalAnswered: nextTotal,
        };
      });

      // Refresh leaderboards
      loadLeaderboards();
    },
    [currentQuestion, isSubmitting, isFlipped, address]
  );

  const handle5050 = () => {
    if (fiftyFiftyUsed || !currentQuestion) return;
    setFiftyFiftyUsed(true);
    // Pick 2 random indices to eliminate
    const indices = [0, 1, 2, 3];
    const shuffled = indices.sort(() => 0.5 - Math.random());
    setEliminatedIndices(shuffled.slice(0, 2));
  };

  const handleSkip = () => {
    if (skipUsed) return;
    setSkipUsed(true);
    loadNextQuestion();
  };

  return (
    <div className="w-full flex justify-center py-6 px-4">
      <div className="w-full max-w-[1540px] flex gap-6 justify-center items-start">
        {/* Left Skyscraper Ad (Desktop Only) */}
        <AdZone variant="skyscraper" slot="left-sky" />

        {/* Center Main Content Area */}
        <div className="flex-1 max-w-6xl w-full flex flex-col items-center">
          {/* Top Banner Ad */}
          <AdZone variant="banner" slot="top-banner" />

          {/* 3-Column Responsive Core App Grid */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Stats & History Sidebar (3 cols) */}
            <div className="lg:col-span-3 w-full order-2 lg:order-1">
              <Sidebar
                stats={stats}
                history={history}
                onOpenReview={() => setActiveModal('review')}
              />
            </div>

            {/* Center Column: Quiz Card & Custom Question Form (6 cols) */}
            <div className="lg:col-span-6 w-full flex flex-col items-center order-1 lg:order-2">
              <QuizCard
                question={currentQuestion}
                isFlipped={isFlipped}
                timeLeft={timeLeft}
                result={result}
                onSelectAnswer={handleAnswerSubmit}
                onNextQuestion={loadNextQuestion}
                onOpenTimerSettings={() => setActiveModal('timer')}
                onUse5050={handle5050}
                onUseSkip={handleSkip}
                fiftyFiftyUsed={fiftyFiftyUsed}
                skipUsed={skipUsed}
                eliminatedIndices={eliminatedIndices}
                isSubmitting={isSubmitting}
                onAddQuestionClick={() => {
                  const form = document.getElementById('custom-form');
                  form?.scrollIntoView({ behavior: 'smooth' });
                }}
              />

              <div id="custom-form" className="w-full mt-4">
                <QuestionForm
                  walletAddress={address || null}
                  onQuestionAdded={loadNextQuestion}
                />
              </div>
            </div>

            {/* Right Column: Leaderboards (3 cols) */}
            <div className="lg:col-span-3 w-full order-3">
              <LeaderboardPanel
                globalEntries={globalLeaderboard}
                groupEntries={groupLeaderboard}
                loading={leaderboardLoading}
                onOpenGroupModal={() => setActiveModal('group')}
              />
            </div>
          </div>

          {/* Bottom Banner Ad */}
          <AdZone variant="banner" slot="bottom-banner" />
        </div>

        {/* Right Skyscraper Ad (Desktop Only) */}
        <AdZone variant="skyscraper" slot="right-sky" />
      </div>

      {/* Modals rendered via Portals */}
      <IntroModal
        isOpen={activeModal === 'intro'}
        onClose={() => setActiveModal(null)}
      />
      <TimerSettingsModal
        isOpen={activeModal === 'timer'}
        onClose={() => setActiveModal(null)}
        currentMode={timerMode}
        currentDuration={timerDuration}
        onSave={(mode, duration) => {
          setTimerMode(mode);
          setTimerDuration(duration);
          setTimeLeft(duration);
        }}
      />
      <GroupModal
        isOpen={activeModal === 'group'}
        onClose={() => setActiveModal(null)}
        walletAddress={address || null}
        onSelectGroup={(groupId) => {
          setSelectedGroupId(groupId);
          loadLeaderboards();
        }}
      />
      <ReviewModal
        isOpen={activeModal === 'review'}
        onClose={() => setActiveModal(null)}
        history={history}
      />
    </div>
  );
}
```

- [ ] **Step 2: Update `app/page.tsx`**
Update `app/page.tsx` to render the `Header` and `QuizLayout`:
```tsx
import Header from '@/components/Header';
import QuizLayout from '@/components/QuizLayout';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col">
      <Header />
      <QuizLayout />
    </main>
  );
}
```

- [ ] **Step 3: Verify build and lint**
```bash
npm run lint && npm run build
```
Expected: Turbopack exit 0, all pages statically generated with zero errors.

- [ ] **Step 4: Commit**
```bash
git add components/QuizLayout.tsx app/page.tsx
git commit -m "feat: integrate QuizLayout state manager with responsive ad zones and modals in Home page"
```
