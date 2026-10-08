# components/seo/SeoFaqSection.tsx
lines:141 exports:default
---
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
