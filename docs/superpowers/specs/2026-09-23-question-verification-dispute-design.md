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
Before database insertion, questions must pass strict validation heuristics:
1. **Prompt Validation**: Must be at least 15 characters, non-empty, and free of vulgar/spam strings.
2. **Option Deduplication**: Case-insensitive comparison ensuring all 4 options are distinct (e.g. rejects "ETH", "eth", "Ethereum", "ETH").
3. **Explanation Requirement**: Explanation is mandatory and must be $\ge 20$ characters explaining why the chosen option is correct.
4. **Wallet Attribution**: Must be linked to the creator's wallet address.

### `disputeQuestion` Server Action
```typescript
export async function disputeQuestion(params: {
  questionId: string;
  reporterWallet: string;
  reason: string;
}): Promise<{ success: boolean; quarantined?: boolean; error?: string }>
```
- Inserts record into `question_disputes`.
- If already reported by this wallet, returns `{ success: false, error: 'You have already reported this question.' }`.
- Increments `dispute_count` on the question.
- If `dispute_count >= 3`, updates `status = 'quarantined'`.
- Quarantined questions are excluded from `fetchRandomQuestion(excludeIds, category)`:
  - Appends `.eq('status', 'verified')`.

---

## 3. UI/UX & Motion Interactions

### Answer Card Dispute Action ([`components/AnswerBack.tsx`](file:///mnt/second_drive/web_quiz/components/AnswerBack.tsx))
- Beside the "Next Question" button, render a subtle, clean **"Report / Dispute Answer"** button with a `Flag` icon.
- Hover: Soft red border highlight (`#FF4757`).
- Active: Tactile spring tap.

### Dispute Modal Dialog ([`components/modals/DisputeModal.tsx`](file:///mnt/second_drive/web_quiz/components/modals/DisputeModal.tsx))
- Extends the existing `Modal.tsx` portal architecture with snappy cubic-bezier easing.
- Options:
  1. *Incorrect correct answer designated*
  2. *Misleading or ambiguous choices*
  3. *Outdated crypto information*
  4. *Spam or low quality*
- Provides immediate visual feedback upon submission: "Dispute submitted. If 3 players report this question, it will be automatically removed from the reward pool."

### Transparency Badging ([`components/QuestionFront.tsx`](file:///mnt/second_drive/web_quiz/components/QuestionFront.tsx))
- Top meta bar displays creator status:
  - If `created_by` is null: "Verified Core" with a `ShieldCheck` icon in `#00FFCC`.
  - If `created_by` is set: "Community • [0x12..34]" in `#FFD166`.
