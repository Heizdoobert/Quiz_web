import { NextRequest, NextResponse } from 'next/server';
import { issueMobileAuthToken, verifyMobileAuthToken, verifyMobileSiwe } from '@/lib/services/mobile-auth';
import { linkWalletToAccount } from '@/lib/services/users';

// Adds a wallet to the signed-in account (it must not have one yet) and returns a
// fresh token that carries it. Mirrors linkWallet in lib/actions/auth-actions.ts.
export async function POST(req: NextRequest) {
  try {
    const bearer = req.headers.get('Authorization');
    const account = bearer?.startsWith('Bearer ') ? verifyMobileAuthToken(bearer.split(' ')[1]) : null;
    if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (account.wallet) return NextResponse.json({ error: 'Wallet already linked' }, { status: 409 });

    const { message, signature, nonceToken } = await req.json();
    if (!message || !signature || !nonceToken) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const proof = await verifyMobileSiwe(message, signature, nonceToken);
    if ('error' in proof) return NextResponse.json({ error: proof.error }, { status: proof.status });

    const linked = await linkWalletToAccount(account.id, proof.address);
    if (linked === 'in_use') return NextResponse.json({ error: 'Wallet is linked to another account' }, { status: 409 });
    if (linked !== 'ok') return NextResponse.json({ error: 'Could not link wallet' }, { status: 500 });

    const token = issueMobileAuthToken({ id: account.id, wallet: proof.address });
    if (!token) return NextResponse.json({ error: 'Failed to issue token' }, { status: 500 });

    return NextResponse.json({ token, accountId: account.id, wallet: proof.address });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
