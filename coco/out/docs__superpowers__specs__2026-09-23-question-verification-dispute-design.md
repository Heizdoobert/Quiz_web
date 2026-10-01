# docs/superpowers/specs/2026-09-23-question-verification-dispute-design.md
lines:83 exports:disputeQuestion
---
# Question Verification & Community Dispute System Design

## Overview
To ensure integrity and transparency in cryptocurrency Learn-to-Earn rewards, community-submitted questions must be verified for factual accuracy and protected against unfair token farming. 

This design implements a **Hybrid Verification & Community Dispute System**:
1. **Automated Submission Guardrails**: Immediate heuristic validation (prompt depth, option deduplication, mandatory explanation depth, and spam prevention) upon creation.
2. **Community Dispute Engine**: A 1-click "Flag / Dispute Question" mechanism on the answer card (`AnswerBack.tsx`) allowing players to challenge inaccuracies.
3. **Automatic Quarantine Threshold**: Any question receiving 3 or more independent disputes from distinct wallets is automatically quarantined from the active quiz pool, protecting the `$QUIZ` token rewards economy.
4. **Transparency Badging**: Distinct badging on questions ("Official Verified" vs "Community Contributed") with creator attribution.

---

## 1. Database Schema Extensions

### `questions` Table Additions
- `status`: `TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('verified', 'pending', 'quarantined', 'rejected'))`
- `dispute_count`: `INTEGER NOT NULL DEFAULT 0`
- `verified_at`: `TIMESTAMPTZ DEFAULT NOW()`

### `question_disputes` Table
Tracks disputes with 1-report-per-wallet idempotency:
```sql
CREATE TABLE IF NOT EXISTS question_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  reporter_wallet TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, reporter_wallet)
);

CREATE INDEX IF NOT EXISTS idx_question_disputes_qid ON question_disputes(question_id);
```

---

## 2. Server Actions & Validation Pipeline

### `createQuestion` Enhancements ([`lib/actions/question-actions.ts`](file:///mnt/second_drive/web_quiz/lib/actions/question-actions.ts))
