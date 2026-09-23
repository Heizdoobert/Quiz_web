'use client';

import React, { useState } from 'react';
import Modal from '@/components/Modal';

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
  const [mode, setMode] = useState(currentMode);
  const [duration, setDuration] = useState(currentDuration);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setMode(currentMode);
      setDuration(currentDuration);
    }
  }

  const presets = [15, 30, 60, 120];

  const handleCancel = () => {
    setMode(currentMode);
    setDuration(currentDuration);
    onClose();
  };

  const handleSave = () => {
    onSave(mode, duration);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Timer & Clock Settings"
      icon="⏱️"
      footer={
        <>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#25284D] hover:bg-[#2D305A] text-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-black rounded-xl bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] hover:opacity-95 text-[#0A1128] transition-all shadow-md cursor-pointer"
          >
            Save Settings
          </button>
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
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
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
              onChange={(e) => setDuration(Math.max(5, parseInt(e.target.value) || 30))}
              className="w-full px-3.5 py-2.5 bg-[#0A1128] border border-[#2D305A] rounded-xl text-white text-sm focus:outline-none focus:border-[#00FFCC] focus:ring-1 focus:ring-[#00FFCC]"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
