import { NextRequest, NextResponse } from 'next/server';
import { parseSiweMessage } from 'viem/siwe';
import { publicClientFor } from '@/lib/utils/chain';
import { verifyMobileNonceToken, issueMobileAuthToken } from '@/lib/services/mobile-auth';
import { ensureAccountForWallet } from '@/lib/services/users';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, signature, nonceToken } = body;
    if (!message || !signature || !nonceToken) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const validNonce = verifyMobileNonceToken(nonceToken);
    if (!validNonce) {
      return NextResponse.json({ error: 'Invalid or expired nonce token' }, { status: 401 });
    }

    const { address, chainId, domain, nonce } = parseSiweMessage(message);
    if (nonce !== validNonce) {
      return NextResponse.json({ error: 'Nonce mismatch' }, { status: 401 });
    }

    const client = chainId ? publicClientFor(chainId) : null;
    if (!address || !client) {
      return NextResponse.json({ error: 'Invalid SIWE message' }, { status: 400 });
    }

    // Verify SIWE signature
    const valid = await client.verifySiweMessage({
      message,
      signature,
      domain,
      nonce,
    });
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const wallet = address.toLowerCase();
    const accountId = await ensureAccountForWallet(wallet);
    if (!accountId) {
      return NextResponse.json({ error: 'Account creation failed' }, { status: 500 });
    }

    const authToken = issueMobileAuthToken({ id: accountId, wallet });
    if (!authToken) {
      return NextResponse.json({ error: 'Failed to issue token' }, { status: 500 });
    }

    return NextResponse.json({ token: authToken, accountId, wallet });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
