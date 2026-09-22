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

  const presets = [15, 30, 60, 120];

  const handleSave = () => {
    onSave(mode, duration);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Timer & Clock Settings"
      icon="⏱️"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            Save Settings
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">Timer Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'per-question' | 'total' | 'stopwatch')}
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="per-question">Per-Question Countdown</option>
            <option value="total">Total Quiz Countdown</option>
            <option value="stopwatch">Stopwatch (Count Up)</option>
          </select>
        </div>

        {mode !== 'stopwatch' && (
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Time Limit (Seconds)
            </label>
            <div className="flex gap-2 mb-3">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDuration(p)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    duration === p
                      ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
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
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
