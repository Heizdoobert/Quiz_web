# docs/superpowers/specs/2026-09-22-quiz-features-phase2-design.md
lines:407 exports:User,Question,ClientQuestion,QuizResult,Group,UserStats,LeaderboardEntry
---
# Quick Quiz — Phase 2: Full Quiz Experience Design

## 1. Overview

Build the complete interactive quiz experience on top of the existing Next.js + Supabase + Web3 foundation (Phase 1). This phase delivers: the 3D flip Quiz Card, Supabase schema and Server Actions data layer, Sidebar with live stats, Custom Question Form, Groups system, Global and Group Leaderboards, responsive Ad Zones, and modal dialogs. Smart contract integration is deferred to a future phase; all scoring and answer verification is handled server-side via Supabase.

## 2. Supabase Schema

### Tables

**`users`**
| Column | Type | Constraints |
|--------|------|-------------|
| `wallet_address` | text | PK |
| `display_name` | text | nullable |
| `created_at` | timestamptz | default `now()` |

**`questions`**
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `category` | text | not null, default `'General'` |
| `prompt` | text | not null |
| `options` | jsonb | not null (array of 4 strings) |
| `correct_index` | int | not null (0–3) |
| `explanation` | text | nullable |
| `created_by` | text | references `users.wallet_address` |
| `created_at` | timestamptz | default `now()` |

**`quiz_results`**
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `wallet_address` | text | references `users.wallet_address`, not null |
| `question_id` | uuid | references `questions.id`, not null |
| `answer_index` | int | not null (0–3) |
| `is_correct` | boolean | not null |
| `answered_at` | timestamptz | default `now()` |

**`groups`**
