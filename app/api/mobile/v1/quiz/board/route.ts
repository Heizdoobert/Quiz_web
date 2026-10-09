import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileAuthToken } from '@/lib/services/mobile-auth';
import { getGlobalLeaderboard } from '@/lib/actions/leaderboard-actions';
import { historyForAccount, statsForAccount, ZERO_STATS } from '@/lib/utils/stats';

// What the web's Live Scoreboard and Global Top panels show: the global leaderboard for
// everyone, plus the player's own stats and recent answers when signed in. Guests get zero
// stats and no history; a wallet is not needed to read any of it.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const account = authHeader?.startsWith('Bearer ') ? verifyMobileAuthToken(authHeader.split(' ')[1]) : null;

  const [stats, history, leaderboard] = await Promise.all([
    account ? statsForAccount(account.id) : ZERO_STATS,
    account ? historyForAccount(account.id) : [],
    getGlobalLeaderboard(50),
  ]);

  return NextResponse.json({ stats, history, leaderboard });
}
