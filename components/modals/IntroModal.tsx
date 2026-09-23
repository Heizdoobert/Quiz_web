'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Modal from '@/components/Modal';
import { Lightbulb, FileEdit, Boxes, Trophy, ArrowRight, ArrowLeft, Rocket } from 'lucide-react';

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
      icon={<Lightbulb className="w-5 h-5 text-[#FFD166]" />}
      footer={
        <div className="flex w-full items-center justify-between">
          {step > 1 ? (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-[#25284D] hover:bg-[#2D305A] text-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </motion.button>
          ) : <div />}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-black rounded-xl bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 text-[#0A1128] transition-all shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC]"
          >
            {step === 3 ? (
              <>
                Let&apos;s Go! <Rocket className="w-4 h-4" />
              </>
            ) : (
              <>
                Next Step <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </div>
      }
    >
      <div className="space-y-4">
        {step === 1 && (
          <div className="text-center py-2 space-y-3">
            <div className="flex justify-center mb-2">
              <div className="p-3 rounded-2xl bg-[#00FFCC]/15 border border-[#00FFCC]/30 text-[#00FFCC]">
                <FileEdit className="w-8 h-8" />
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-[#00FFCC]/15 text-[#00FFCC] border border-[#00FFCC]/30 rounded-full font-heading">
              Step 1 of 3
            </span>
            <h3 className="text-lg font-bold text-white font-heading">Create Your Questions</h3>
            <p className="text-sm text-slate-300">
              Click <strong className="text-[#00FFCC]">&quot;Add Custom Question&quot;</strong> to enter your question text, 4 options, and select the radio button next to the correct answer.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="text-center py-2 space-y-3">
            <div className="flex justify-center mb-2">
              <div className="p-3 rounded-2xl bg-[#6C5CE7]/20 border border-[#6C5CE7]/40 text-[#6C5CE7]">
                <Boxes className="w-8 h-8" />
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-[#6C5CE7]/20 text-[#6C5CE7] border border-[#6C5CE7]/40 rounded-full font-heading">
              Step 2 of 3
            </span>
            <h3 className="text-lg font-bold text-white font-heading">Build Your Trivia Pool</h3>
            <p className="text-sm text-slate-300">
              Every question you add is stored securely in Supabase. Your questions become playable by everyone in the community!
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-2 space-y-3">
            <div className="flex justify-center mb-2">
              <div className="p-3 rounded-2xl bg-[#FFD166]/20 border border-[#FFD166]/40 text-[#FFD166]">
                <Trophy className="w-8 h-8" />
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-[#FFD166]/20 text-[#FFD166] border border-[#FFD166]/40 rounded-full font-heading">
              Step 3 of 3
            </span>
            <h3 className="text-lg font-bold text-white font-heading">Play & Climb Ranks</h3>
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
