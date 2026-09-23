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
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#25284D] hover:bg-[#2D305A] text-slate-200 transition-colors cursor-pointer"
            >
              ← Back
            </button>
          ) : <div />}
          <button
            onClick={handleNext}
            className="px-5 py-2 text-sm font-black rounded-xl bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 text-[#0A1128] transition-all shadow-md cursor-pointer"
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
            <span className="text-xs font-bold px-2.5 py-1 bg-[#00FFCC]/15 text-[#00FFCC] border border-[#00FFCC]/30 rounded-full">
              Step 1 of 3
            </span>
            <h3 className="text-lg font-bold text-white">Create Your Questions</h3>
            <p className="text-sm text-slate-300">
              Click <strong className="text-[#00FFCC]">&quot;Add Custom Question&quot;</strong> to enter your question text, 4 options, and select the radio button next to the correct answer.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="text-center py-2 space-y-3">
            <div className="text-4xl mb-2">📦</div>
            <span className="text-xs font-bold px-2.5 py-1 bg-[#6C5CE7]/20 text-[#6C5CE7] border border-[#6C5CE7]/40 rounded-full">
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
            <span className="text-xs font-bold px-2.5 py-1 bg-[#FFD166]/20 text-[#FFD166] border border-[#FFD166]/40 rounded-full">
              Step 3 of 3
            </span>
            <h3 className="text-lg font-bold text-white">Play & Climb Ranks</h3>
            <p className="text-sm text-slate-300">
              Use keys <strong className="text-[#00FFCC]">1–4</strong> or <strong className="text-[#00FFCC]">A–D</strong> to answer. Enjoy live streak tracking, accuracy stats, and compete for top ranks on the Global and Group Leaderboards!
            </p>
          </div>
        )}

        {/* Step dots */}
        <div className="flex justify-center gap-2 pt-4">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`h-2.5 rounded-full transition-all ${
                step === s ? 'bg-[#00FFCC] w-6' : 'bg-[#2D305A] hover:bg-[#6C5CE7] w-2.5'
              }`}
              aria-label={`Step ${s}`}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
