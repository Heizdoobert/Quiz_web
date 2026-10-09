import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileSiwe, issueMobileAuthToken } from '@/lib/services/mobile-auth';
import { ensureAccountForWallet } from '@/lib/services/users';

// Wallet-only sign-in (a wallet with no username, Google or password account).
export async function POST(req: NextRequest) {
  try {
    const { message, signature, nonceToken } = await req.json();
    if (!message || !signature || !nonceToken) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const proof = await verifyMobileSiwe(message, signature, nonceToken);
    if ('error' in proof) return NextResponse.json({ error: proof.error }, { status: proof.status });

    const accountId = await ensureAccountForWallet(proof.address);
    if (!accountId) {
      return NextResponse.json({ error: 'Account creation failed' }, { status: 500 });
    }

    const token = issueMobileAuthToken({ id: accountId, wallet: proof.address });
    if (!token) {
      return NextResponse.json({ error: 'Failed to issue token' }, { status: 500 });
    }

    return NextResponse.json({ token, accountId, wallet: proof.address });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
