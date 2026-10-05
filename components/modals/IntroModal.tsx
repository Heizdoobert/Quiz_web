'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Modal from '@/components/Modal';
import { useIntroModal } from '@/hooks/modals/use-intro-modal';
import { Lightbulb, FileEdit, Boxes, Trophy, ArrowRight, ArrowLeft, Rocket } from 'lucide-react';

interface IntroModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IntroModal({ isOpen, onClose }: IntroModalProps) {
  const { step, setStep, handleNext, handleBack } = useIntroModal({ onClose });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How to Create & Play"
      icon={<Lightbulb className="w-5 h-5 text-crypto-gold" />}
      footer={
        <div className="flex w-full items-center justify-between">
          {step > 1 ? (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-cyber-violet-light hover:bg-cyber-border text-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
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
            className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-black rounded-xl bg-linear-to-r from-neo-mint to-electric-indigo hover:opacity-95 text-deep-space transition-[color,background-color,border-color,opacity,box-shadow] shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint"
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
      <div className="space-y-5">
        {step === 1 && (
          <div className="text-center py-3 space-y-4">
            <div className="flex justify-center mb-2">
              <div className="p-4 rounded-2xl bg-neo-mint/15 border border-neo-mint/30 text-neo-mint">
                <FileEdit className="w-8 h-8" />
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-neo-mint/15 text-neo-mint border border-neo-mint/30 rounded-full font-heading">
              Step 1 of 3
            </span>
            <h3 className="text-lg font-bold text-white">Create Your Questions</h3>
            <p className="text-sm text-slate-300">
              Click <strong className="text-neo-mint">&quot;Add Custom Question&quot;</strong> to enter your question text, 4 options, and select the radio button next to the correct answer.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="text-center py-3 space-y-4">
            <div className="flex justify-center mb-2">
              <div className="p-4 rounded-2xl bg-electric-indigo/20 border border-electric-indigo/40 text-electric-indigo">
                <Boxes className="w-8 h-8" />
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-electric-indigo/20 text-electric-indigo border border-electric-indigo/40 rounded-full font-heading">
              Step 2 of 3
            </span>
            <h3 className="text-lg font-bold text-white">Build Your Trivia Pool</h3>
            <p className="text-sm text-slate-300">
              Every question you add is stored securely in Supabase. Your questions become playable by everyone in the community!
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-3 space-y-4">
            <div className="flex justify-center mb-2">
              <div className="p-4 rounded-2xl bg-crypto-gold/20 border border-crypto-gold/40 text-crypto-gold">
                <Trophy className="w-8 h-8" />
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-crypto-gold/20 text-crypto-gold border border-crypto-gold/40 rounded-full font-heading">
              Step 3 of 3
            </span>
            <h3 className="text-lg font-bold text-white">Play & Climb Ranks</h3>
            <p className="text-sm text-slate-300">
              Use keys <strong className="text-neo-mint">1–4</strong> or <strong className="text-neo-mint">A–D</strong> to answer. Enjoy live streak tracking, accuracy stats, and compete for top ranks on the Global and Group Leaderboards!
            </p>
          </div>
        )}

        {/* Step dots */}
        <div className="flex justify-center gap-2 pt-4">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={`h-2.5 rounded-full transition-all cursor-pointer active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint ${
                step === s ? 'bg-neo-mint w-6' : 'bg-cyber-border hover:bg-electric-indigo w-2.5'
              }`}
              aria-label={`Step ${s}`}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
