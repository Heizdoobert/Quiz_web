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
