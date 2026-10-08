# components/auth/AuthChoiceScreen.tsx
lines:67 exports:AuthChoiceScreenProps,default
---
"use client";

import React from "react";
import { motion } from "framer-motion";

export interface AuthChoiceScreenProps {
  onSelectMode: (mode: "login" | "register") => void;
  onClose: () => void;
}

export default function AuthChoiceScreen({
  onSelectMode,
  onClose,
}: AuthChoiceScreenProps) {
  return (
    <motion.div
      key="choice"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-white tracking-wide">
          Ready to play?
        </h3>
        <p className="text-sm text-slate-400">
          Sign in to save your progress and earn rewards.
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onSelectMode("login")}
          className="w-full flex flex-col items-center justify-center py-3.5 bg-linear-to-r from-neo-mint to-electric-indigo text-deep-space rounded-xl font-black shadow-md hover:opacity-95 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span className="text-base">Sign In</span>
          <span className="text-xs opacity-80 font-medium">
            Log into your existing account
