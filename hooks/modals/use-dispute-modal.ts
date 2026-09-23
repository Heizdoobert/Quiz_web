'use client';

import { useState } from 'react';
import { disputeQuestion } from '@/lib/actions/question-actions';

export const DISPUTE_REASONS = [
  { id: 'incorrect_answer', label: 'Designated answer is factually incorrect' },
  { id: 'ambiguous_options', label: 'Options are misleading or multiple answers are correct' },
  { id: 'outdated_info', label: 'Outdated crypto protocol or tech information' },
  { id: 'spam_low_quality', label: 'Spam, promotional content, or poor quality' },
];

interface UseDisputeModalOptions {
  onClose: () => void;
  questionId?: string | null;
  walletAddress?: string | null;
}

export function useDisputeModal({ onClose, questionId, walletAddress }: UseDisputeModalOptions) {
  const [selectedReason, setSelectedReason] = useState(DISPUTE_REASONS[0].id);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isQuarantined, setIsQuarantined] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionId) {
      setError('No active question to dispute.');
      return;
    }
    if (!walletAddress) {
      setError('Please connect your Web3 wallet to submit a dispute.');
      return;
    }

    setLoading(true);
    setError(null);

    const fullReason = `${selectedReason}${details.trim() ? `: ${details.trim()}` : ''}`;
    const res = await disputeQuestion({
      questionId,
      reporterWallet: walletAddress,
      reason: fullReason,
    });

    setLoading(false);
    if (res.success) {
      setSuccess(true);
      setIsQuarantined(Boolean(res.quarantined));
    } else {
      setError(res.error || 'Failed to submit dispute.');
    }
  };

  const handleResetAndClose = () => {
    setSuccess(false);
    setError(null);
    setDetails('');
    onClose();
  };

  return {
    selectedReason,
    setSelectedReason,
    details,
    setDetails,
    loading,
    error,
    success,
    isQuarantined,
    handleSubmit,
    handleResetAndClose,
  };
}
