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
          Sign in to save your score and climb the leaderboard.
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
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode("register")}
          className="w-full flex flex-col items-center justify-center py-3.5 border border-neo-mint text-neo-mint bg-neo-mint/10 rounded-xl font-black shadow-sm hover:bg-neo-mint/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint"
        >
          <span className="text-base">Create Account</span>
          <span className="text-xs opacity-80 font-medium">
            Join Quick Quiz today
          </span>
        </button>
      </div>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:underline"
        >
          Play without an account
        </button>
      </div>
    </motion.div>
  );
}
