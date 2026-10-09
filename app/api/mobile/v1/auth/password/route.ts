import { NextRequest, NextResponse } from 'next/server';
import { issueMobileAuthToken } from '@/lib/services/mobile-auth';
import { signInAccount, signUpAccount } from '@/lib/services/credentials';

// Username + password sign-in or sign-up. No wallet needed; one is linked later,
// when the player first wants to answer (auth/wallet).
export async function POST(req: NextRequest) {
  try {
    const { mode, username, password } = await req.json();
    if ((mode !== 'signin' && mode !== 'signup') || typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const result = mode === 'signup' ? await signUpAccount(username, password) : await signInAccount(username, password);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });

    const token = issueMobileAuthToken(result.account);
    if (!token) return NextResponse.json({ error: 'Failed to issue token' }, { status: 500 });

    return NextResponse.json({ token, accountId: result.account.id, wallet: result.account.wallet });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
