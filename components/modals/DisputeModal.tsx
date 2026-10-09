'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Modal from '@/components/ui/Modal';
import { DISPUTE_REASONS, useDisputeModal } from '@/hooks/modals/use-dispute-modal';
import { AlertTriangle, Flag, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId?: string | null;
}

export default function DisputeModal({
  isOpen,
  onClose,
  questionId,
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
  } = useDisputeModal({ onClose, questionId });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title="Dispute Question"
      icon={<AlertTriangle className="w-5 h-5 text-pop-coral" />}
      maxWidth="max-w-md"
    >
      {success ? (
        <div className="text-center py-7 space-y-5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-neo-mint/15 border border-neo-mint/40 flex items-center justify-center text-neo-mint">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-base text-slate-100">
              Dispute Recorded
            </h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Thank you for helping keep our questions accurate.
            </p>
            {isQuarantined && (
              <div className="mt-3 p-4 rounded-xl bg-pop-coral/10 border border-pop-coral/30 text-pop-coral text-xs font-medium flex items-center justify-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Threshold met! This question has been quarantined from the question pool.</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-full py-2.5 rounded-xl bg-cyber-violet-light hover:bg-[#2E3260] active:scale-95 text-slate-200 hover:text-white font-bold font-heading text-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-xs text-slate-400 leading-relaxed">
            Report factual errors or unfair options to keep the question pool accurate.
          </p>

          {error && (
            <div role="alert" className="p-4 rounded-xl bg-pop-coral/15 border border-pop-coral/40 text-pop-coral text-xs font-medium">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <span id="dispute-reason-label" className="block text-xs font-bold text-slate-300 font-heading uppercase tracking-wider">
              Dispute Reason
            </span>
            <div role="radiogroup" aria-labelledby="dispute-reason-label" className="space-y-2">
              {DISPUTE_REASONS.map((r) => (
                <label
                  key={r.id}
                  className={`flex items-start gap-2.5 p-4 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedReason === r.id
                      ? 'bg-pop-coral/10 border-pop-coral/50 text-slate-100'
                      : 'bg-deep-space/70 border-cyber-border text-slate-400 hover:text-slate-300 hover:border-[#3A3E70]'
                  }`}
                >
                  <input
                    type="radio"
                    name="dispute_reason"
                    value={r.id}
                    checked={selectedReason === r.id}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-0.5 accent-pop-coral"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="dispute-details" className="block text-xs font-bold text-slate-300 font-heading uppercase tracking-wider mb-1.5">
              Additional Details (Optional)
            </label>
            <textarea
              id="dispute-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Cite verified sources or explanation..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-deep-space border border-cyber-border focus:border-pop-coral focus:outline-none text-xs text-slate-200 placeholder:text-slate-500 resize-none transition-colors"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="flex-1 py-2.5 rounded-xl bg-cyber-violet-light hover:bg-[#2E3260] active:scale-95 text-slate-400 hover:text-slate-200 font-bold font-heading text-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={loading ? {} : { filter: 'brightness(1.1)' }}
              whileTap={loading ? {} : { scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className="flex-1 py-2.5 rounded-xl bg-pop-coral disabled:opacity-50 disabled:pointer-events-none text-white font-black font-heading text-xs cursor-pointer flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pop-coral focus-visible:ring-offset-2 focus-visible:ring-offset-cyber-violet"
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
