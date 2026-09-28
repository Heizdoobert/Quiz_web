'use client';

import React from 'react';

export default function CreatorSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading your created quizzes"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <span className="sr-only">Loading your created quizzes...</span>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl border border-[#2D305A]/70 bg-[#1A1B35]/40 flex flex-col justify-between h-44 animate-pulse"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="h-5 w-20 bg-[#25284D] rounded-md" />
              <div className="h-4 w-12 bg-[#25284D]/70 rounded-md" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-[#25284D] rounded-md w-full" />
              <div className="h-4 bg-[#25284D]/80 rounded-md w-4/5" />
              <div className="h-4 bg-[#25284D]/50 rounded-md w-2/3" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-[#2D305A]/40">
            <div className="h-6 w-24 bg-[#0A1128] rounded-lg" />
            <div className="h-4 w-16 bg-[#25284D]/60 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
