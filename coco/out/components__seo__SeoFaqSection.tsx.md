# components/seo/SeoFaqSection.tsx
lines:140 exports:default
---
'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Trophy, Users, ShieldCheck, Zap } from 'lucide-react';
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
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Score & Streaks</h3>
            <p className="text-xs text-slate-400 mt-1">One point per correct answer. Build streaks and climb the global leaderboard.</p>
          </div>
        </div>

        <div className="glass glass-border rounded-2xl p-5 flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-electric-indigo/10 text-electric-indigo shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Groups</h3>
            <p className="text-xs text-slate-400 mt-1">Create or join groups with their own leaderboards.</p>
          </div>
        </div>
