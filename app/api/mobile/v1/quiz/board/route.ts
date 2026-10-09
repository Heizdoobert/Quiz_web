import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileAuthToken } from '@/lib/services/mobile-auth';
import { getGlobalLeaderboard } from '@/lib/actions/leaderboard-actions';
import { historyForAccount, statsForAccount } from '@/lib/utils/stats';

// What the web's Live Scoreboard and Global Top panels show: the signed-in player's stats and
// recent answers, plus the global leaderboard. A wallet is not needed to read them.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const account = verifyMobileAuthToken(authHeader.split(' ')[1]);
  if (!account) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [stats, history, leaderboard] = await Promise.all([
    statsForAccount(account.id),
    historyForAccount(account.id),
    getGlobalLeaderboard(50),
  ]);

  return NextResponse.json({ stats, history, leaderboard });
}
