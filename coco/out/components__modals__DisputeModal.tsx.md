# components/modals/DisputeModal.tsx
lines:156 exports:default
---
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Modal from '../Modal';
import { DISPUTE_REASONS, useDisputeModal } from '@/hooks/modals/use-dispute-modal';
import { AlertTriangle, Flag, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId?: string | null;
  walletAddress?: string | null;
}

export default function DisputeModal({
  isOpen,
  onClose,
  questionId,
  walletAddress,
}: DisputeModalProps) {
  const {
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
  } = useDisputeModal({ onClose, questionId, walletAddress });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title="Dispute Question"
      icon={<AlertTriangle className="w-5 h-5 text-pop-coral" />}
