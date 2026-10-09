import { NextRequest, NextResponse } from 'next/server';
import { issueMobileAuthToken } from '@/lib/services/mobile-auth';
import { signInAccountWithGoogle } from '@/lib/services/credentials';

// Google sign-in with the ID token the app got from the OS. No wallet needed.
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (typeof idToken !== 'string' || !idToken) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const result = await signInAccountWithGoogle(idToken);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });

    const token = issueMobileAuthToken(result.account);
    if (!token) return NextResponse.json({ error: 'Failed to issue token' }, { status: 500 });

    return NextResponse.json({ token, accountId: result.account.id, wallet: result.account.wallet });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
