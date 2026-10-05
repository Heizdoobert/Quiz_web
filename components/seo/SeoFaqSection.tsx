'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Award, Coins, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FAQ_DATA } from '@/lib/constants/seo-data';

export default function SeoFaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section 
      aria-label="About Quick Quiz and Frequently Asked Questions"
      className="w-full max-w-4xl mx-auto mt-12 mb-16 px-4"
    >
      {/* Platform Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="glass glass-border rounded-2xl p-5 flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-neo-mint/10 text-neo-mint shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Learn-to-Earn $QUIZ</h3>
            <p className="text-xs text-slate-400 mt-1">Earn 10 $QUIZ per correct answer with instant on-chain voucher signing.</p>
          </div>
        </div>

        <div className="glass glass-border rounded-2xl p-5 flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-electric-indigo/10 text-electric-indigo shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Milestone NFT Badges</h3>
            <p className="text-xs text-slate-400 mt-1">Unlock ERC-721 trophy badges on Base Sepolia as you climb the ranks.</p>
          </div>
        </div>

        <div className="glass glass-border rounded-2xl p-5 flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-cat-l1/10 text-cat-l1 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Anti-Cheat Architecture</h3>
            <p className="text-xs text-slate-400 mt-1">Server-side answer validation and deterministic 50:50 power-ups.</p>
          </div>
        </div>
      </div>

      {/* SEO Heading & Introduction */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neo-mint/10 text-neo-mint text-xs font-medium tracking-wide uppercase mb-3">
          <Zap className="w-3.5 h-3.5" />
          Web3 Knowledge Arena
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          Master Crypto Trivia. Earn On-Chain Rewards.
        </h2>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto mt-2 leading-relaxed">
          Quick Quiz is the premier decentralized Web3 trivia platform. Test your knowledge in DeFi, Layer 1 blockchains, Smart Contracts, and NFT gaming while earning real crypto incentives on the Coinbase Base network.
        </p>
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2 text-slate-300 font-semibold text-sm">
          <HelpCircle className="w-4 h-4 text-neo-mint" />
          <h3>Frequently Asked Questions</h3>
        </div>

        {FAQ_DATA.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl overflow-hidden border transition-all duration-300 ${
                isOpen
                  ? 'bg-linear-to-b from-neo-mint/[0.07] to-cyber-violet border-neo-mint/40 shadow-lg shadow-neo-mint/10'
                  : 'glass glass-border border-transparent hover:border-electric-indigo/60 hover:bg-elevation-2'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full text-left px-5 py-4 flex items-center gap-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neo-mint focus-visible:ring-inset"
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${idx}`}
              >
                <span
                  className={`font-mono text-[11px] font-bold tabular-nums tracking-wider shrink-0 transition-colors duration-300 ${
                    isOpen ? 'text-neo-mint' : 'text-slate-500'
                  }`}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span
                  className={`flex-1 text-sm font-semibold transition-colors duration-300 ${
                    isOpen ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  {faq.question}
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`p-1.5 rounded-full border shrink-0 transition-colors duration-300 ${
                    isOpen
                      ? 'bg-neo-mint border-neo-mint text-deep-space'
                      : 'border-cyber-border text-slate-400'
                  }`}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`faq-answer-${idx}`}
                    role="region"
                    initial={{ height: 0, opacity: 0, y: -6 }}
                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 32 }}
                    className="overflow-hidden"
                  >
                    <div className="mx-5 mb-4 pl-4 border-l-2 border-neo-mint/60 text-[13px] text-slate-300 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
