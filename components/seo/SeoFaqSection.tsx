'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Award, Coins, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FAQ_DATA } from '@/lib/seo-data';

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
        <div className="glass glass-border border border-transparent rounded-2xl p-5 flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-[#00FFCC]/10 text-[#00FFCC] shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Learn-to-Earn $QUIZ</h3>
            <p className="text-xs text-slate-400 mt-1">Earn 10 $QUIZ per correct answer with instant on-chain voucher signing.</p>
          </div>
        </div>

        <div className="glass glass-border border border-transparent rounded-2xl p-5 flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-[#6C5CE7]/10 text-[#6C5CE7] shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Milestone NFT Badges</h3>
            <p className="text-xs text-slate-400 mt-1">Unlock ERC-721 trophy badges on Base Sepolia as you climb the ranks.</p>
          </div>
        </div>

        <div className="glass glass-border border border-transparent rounded-2xl p-5 flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-[#3071FF]/10 text-[#3071FF] shrink-0">
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00FFCC]/10 text-[#00FFCC] text-xs font-medium tracking-wide uppercase mb-3">
          <Zap className="w-3.5 h-3.5" />
          Web3 Knowledge Arena
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white font-heading">
          Master Crypto Trivia. Earn On-Chain Rewards.
        </h2>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto mt-2 leading-relaxed">
          Quick Quiz is the premier decentralized Web3 trivia platform. Test your knowledge in DeFi, Layer 1 blockchains, Smart Contracts, and NFT gaming while earning real crypto incentives on the Coinbase Base network.
        </p>
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2 text-slate-300 font-semibold text-sm">
          <HelpCircle className="w-4 h-4 text-[#00FFCC]" />
          <h3>Frequently Asked Questions</h3>
        </div>

        {FAQ_DATA.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="glass glass-border border border-transparent rounded-2xl overflow-hidden transition-colors hover:border-[#6C5CE7]/60"
            >
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 text-sm font-medium text-slate-200 hover:text-white focus-visible:outline-none focus-visible:bg-[#1A1B35]"
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${idx}`}
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-[#00FFCC]' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    id={`faq-answer-${idx}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 text-xs text-slate-400 leading-relaxed border-t border-[#2D305A] pt-3">
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
