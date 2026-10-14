# hooks/modals/use-dispute-modal.ts
lines:74 exports:DISPUTE_REASONS,useDisputeModal
---
'use client';

import { useState } from 'react';
import { disputeQuestion } from '@/lib/actions/question-actions';
import { useSession } from '@/hooks/shared/use-session';

export const DISPUTE_REASONS = [
  { id: 'incorrect_answer', label: 'Designated answer is factually incorrect' },
  { id: 'ambiguous_options', label: 'Options are misleading or multiple answers are correct' },
  { id: 'outdated_info', label: 'Outdated information' },
  { id: 'spam_low_quality', label: 'Spam, promotional content, or poor quality' },
];

interface UseDisputeModalOptions {
  onClose: () => void;
  questionId?: string | null;
}

export function useDisputeModal({ onClose, questionId }: UseDisputeModalOptions) {
  const [selectedReason, setSelectedReason] = useState(DISPUTE_REASONS[0].id);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isQuarantined, setIsQuarantined] = useState(false);
  const { requireSignIn: ensureSession } = useSession();

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!questionId) {
      setError('No active question to dispute.');
      return;
    }

    setLoading(true);
    setError(null);

    if (!(await ensureSession())) {
      setLoading(false);
      setError('Sign in to submit a dispute.');
