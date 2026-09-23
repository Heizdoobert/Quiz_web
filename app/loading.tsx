export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0A1128] text-white flex flex-col items-center justify-center p-6" aria-busy="true" aria-label="Loading Quick Quiz">
      <div className="flex flex-col items-center gap-4 max-w-sm w-full text-center">
        {/* Animated Icon */}
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-[#00FFCC]/15 border border-[#00FFCC]/40 text-3xl animate-pulse shadow-lg shadow-[#00FFCC]/20">
          ⚡
        </div>
        <h2 className="text-2xl font-black bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] bg-clip-text text-transparent tracking-wide">
          Quick Quiz
        </h2>
        <p className="text-xs text-slate-400">Loading crypto trivia & web3 leaderboards...</p>

        {/* Skeleton Progress Bar */}
        <div className="w-full h-1.5 bg-[#1A1B35] rounded-full overflow-hidden mt-2 border border-[#2D305A]">
          <div className="h-full bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] w-1/2 animate-[shimmer_1.5s_infinite]" />
        </div>
      </div>
    </div>
  );
}
