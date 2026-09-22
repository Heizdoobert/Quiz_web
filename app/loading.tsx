export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6" aria-busy="true" aria-label="Loading Quick Quiz">
      <div className="flex flex-col items-center gap-4 max-w-sm w-full text-center">
        {/* Animated Icon */}
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-3xl animate-pulse">
          ⚡
        </div>
        <h2 className="text-xl font-bold text-white tracking-wide">Quick Quiz</h2>
        <p className="text-xs text-slate-400">Loading trivia questions and leaderboards...</p>

        {/* Skeleton Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 w-1/2 animate-[shimmer_1.5s_infinite]" />
        </div>
      </div>
    </div>
  );
}
