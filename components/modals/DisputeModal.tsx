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
      icon={<AlertTriangle className="w-5 h-5 text-[#FF4757]" />}
      maxWidth="max-w-md"
    >
      {success ? (
        <div className="text-center py-7 space-y-5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#00FFCC]/15 border border-[#00FFCC]/40 flex items-center justify-center text-[#00FFCC]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-base text-slate-100 !font-sans">
              Dispute Recorded
            </h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Thank you for protecting the integrity of our Crypto Learn-to-Earn ecosystem.
            </p>
            {isQuarantined && (
              <div className="mt-3 p-4 rounded-xl bg-[#FF4757]/10 border border-[#FF4757]/30 text-[#FF4757] text-xs font-medium flex items-center justify-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Threshold met! This question has been quarantined from the reward pool.</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-full py-2.5 rounded-xl bg-[#25284D] hover:bg-[#2E3260] active:scale-95 text-slate-200 hover:text-white font-bold font-heading text-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC]"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-xs text-slate-400 leading-relaxed">
            Report factual errors or unfair options to protect the Learn-to-Earn reward pool.
          </p>

          {error && (
            <div className="p-4 rounded-xl bg-[#FF4757]/15 border border-[#FF4757]/40 text-[#FF4757] text-xs font-medium">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 font-heading uppercase tracking-wider">
              Dispute Reason
            </label>
            <div className="space-y-2">
              {DISPUTE_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-2.5 p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedReason === r.id
                      ? 'bg-[#FF4757]/10 border-[#FF4757]/50 text-slate-100'
                      : 'bg-[#0A1128]/70 border-[#2D305A] text-slate-400 hover:text-slate-300 hover:border-[#3A3E70]'
                  }`}
                >
                  <input
                    type="radio"
                    name="dispute_reason"
                    value={r.id}
                    checked={selectedReason === r.id}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-0.5 accent-[#FF4757]"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 font-heading uppercase tracking-wider mb-1.5">
              Additional Details (Optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Cite verified sources or explanation..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-[#0A1128] border border-[#2D305A] focus:border-[#FF4757] focus:outline-none text-xs text-slate-200 placeholder:text-slate-500 resize-none transition-colors"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="flex-1 py-2.5 rounded-xl bg-[#25284D] hover:bg-[#2E3260] active:scale-95 text-slate-400 hover:text-slate-200 font-bold font-heading text-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              disabled={loading || !walletAddress}
              whileHover={loading || !walletAddress ? {} : { filter: 'brightness(1.1)' }}
              whileTap={loading || !walletAddress ? {} : { scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className="flex-1 py-2.5 rounded-xl bg-[#FF4757] disabled:opacity-50 disabled:pointer-events-none text-white font-black font-heading text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(255,71,87,0.3)] flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4757] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1B35]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Flag className="w-3.5 h-3.5" />
                  <span>Submit Dispute</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      )}
    </Modal>
  );
}
