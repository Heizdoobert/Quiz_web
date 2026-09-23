'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Modal from '@/components/Modal';
import { useTimerSettingsModal } from '@/hooks/modals/use-timer-settings-modal';
import { Clock } from 'lucide-react';

interface TimerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: 'per-question' | 'total' | 'stopwatch';
  currentDuration: number;
  onSave: (mode: 'per-question' | 'total' | 'stopwatch', duration: number) => void;
}

export default function TimerSettingsModal({
  isOpen,
  onClose,
  currentMode,
  currentDuration,
  onSave,
}: TimerSettingsModalProps) {
  const { mode, setMode, duration, setDuration, setValidatedDuration, handleCancel, handleSave } =
    useTimerSettingsModal({ isOpen, currentMode, currentDuration, onSave, onClose });

  const presets = [15, 30, 60, 120];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Timer & Clock Settings"
      icon={<Clock className="w-5 h-5 text-[#00FFCC]" />}
      footer={
        <>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#25284D] hover:bg-[#2D305A] text-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Cancel
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            onClick={handleSave}
            className="px-5 py-2 text-sm font-black rounded-xl bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 text-[#0A1128] transition-all shadow-md cursor-pointer font-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFCC]"
          >
            Save Settings
          </motion.button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-white mb-2">Timer Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'per-question' | 'total' | 'stopwatch')}
            className="w-full px-3.5 py-2.5 bg-[#0A1128] border border-[#2D305A] rounded-xl text-white text-sm focus:outline-none focus:border-[#00FFCC] focus:ring-1 focus:ring-[#00FFCC]"
          >
            <option value="per-question">Per-Question Countdown</option>
            <option value="total">Total Quiz Countdown</option>
            <option value="stopwatch">Stopwatch (Count Up)</option>
          </select>
        </div>

        {mode !== 'stopwatch' && (
          <div>
            <label className="block text-sm font-bold text-white mb-2">
              Time Limit (Seconds)
            </label>
            <div className="flex gap-2 mb-3">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDuration(p)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-heading border transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C5CE7] ${
                    duration === p
                      ? 'bg-[#6C5CE7] border-[#6C5CE7] text-white shadow-sm'
                      : 'bg-[#0A1128] border-[#2D305A] text-slate-300 hover:bg-[#25284D] hover:border-[#6C5CE7]/50'
                  }`}
                >
                  {p < 60 ? `${p}s` : `${p / 60}m`}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="5"
              max="600"
              value={duration}
              onChange={(e) => setValidatedDuration(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0A1128] border border-[#2D305A] rounded-xl text-white text-sm focus:outline-none focus:border-[#00FFCC] focus:ring-1 focus:ring-[#00FFCC]"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
