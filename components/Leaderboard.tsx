import prisma from '@/lib/prisma';

export async function Leaderboard() {
  const topScores = await prisma.leaderboard.findMany({
    orderBy: { score: 'desc' },
    take: 10,
  });

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-gray-900 rounded-xl shadow-lg border border-gray-800 text-white">
      <h2 className="text-2xl font-bold mb-4 text-neo-mint">Global Leaderboard</h2>
      {topScores.length === 0 ? (
        <p className="text-gray-400 text-center py-4">No scores yet. Be the first to play!</p>
      ) : (
        <div className="space-y-3">
          {topScores.map((entry, index) => (
            <div key={entry.id} className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-xl font-bold text-gray-500 w-6">{index + 1}.</span>
                <span className="font-mono text-sm">{entry.user.slice(0, 6)}...{entry.user.slice(-4)}</span>
              </div>
              <div className="font-bold text-neo-mint">{entry.score} pts</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
