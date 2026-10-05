import { Zap } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-deep-space text-white flex flex-col items-center justify-center p-6" aria-busy="true" aria-label="Loading Quick Quiz">
      <div className="flex flex-col items-center gap-4 max-w-sm w-full text-center">
        {/* Animated Icon */}
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-neo-mint/15 border border-neo-mint/40 text-neo-mint animate-pulse shadow-lg shadow-neo-mint/20">
          <Zap className="w-8 h-8 fill-neo-mint" />
        </div>
        <h2 className="text-2xl font-black bg-gradient-to-r from-neo-mint to-electric-indigo bg-clip-text text-transparent tracking-wide font-heading">
          Quick Quiz
        </h2>
        <p className="text-xs text-slate-400">Loading crypto trivia & web3 leaderboards...</p>

        {/* Skeleton Progress Bar */}
        <div className="w-full h-1.5 bg-cyber-violet rounded-full overflow-hidden mt-2 border border-cyber-border">
          <div className="h-full bg-gradient-to-r from-neo-mint to-electric-indigo w-1/2 animate-[shimmer_1.5s_infinite]" />
        </div>
      </div>
    </div>
  );
}
