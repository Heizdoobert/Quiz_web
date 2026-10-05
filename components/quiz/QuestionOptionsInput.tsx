import React from 'react';

export function QuestionOptionsInput({
  options,
  correctIndex,
  onOptionChange,
  onCorrectIndexChange,
}: {
  options: string[];
  correctIndex: number;
  onOptionChange: (idx: number, value: string) => void;
  onCorrectIndexChange: (idx: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-bold text-slate-300">
          Answer Options <span className="text-[#FF4757]">*</span>
        </label>
        <span className="text-[11px] text-slate-400">Radio button selects correct answer</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {['A', 'B', 'C', 'D'].map((letter, idx) => (
          <div
            key={letter}
            className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
              correctIndex === idx
                ? 'bg-[#00FFCC]/10 border-[#00FFCC]/50'
                : 'bg-[#0A1128] border-[#2D305A] hover:border-[#6C5CE7]/50'
            }`}
          >
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="correct-option"
                checked={correctIndex === idx}
                onChange={() => onCorrectIndexChange(idx)}
                className="w-4 h-4 text-[#00FFCC] accent-[#00FFCC] bg-[#1A1B35] border-[#2D305A] cursor-pointer"
              />
              <span className="font-black text-xs px-2 py-0.5 rounded-lg bg-[#1A1B35] text-slate-300 font-heading">
                {letter}
              </span>
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={options[idx]}
              onChange={(e) => onOptionChange(idx, e.target.value)}
              placeholder={`Option ${letter}`}
              className="flex-1 bg-transparent border-none text-white text-xs focus:outline-none placeholder:text-slate-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
