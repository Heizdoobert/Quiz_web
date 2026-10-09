import { NextResponse } from 'next/server';
import { generateSiweNonce } from 'viem/siwe';
import { issueMobileNonceToken } from '@/lib/services/mobile-auth';

export async function POST() {
  const nonce = generateSiweNonce();
  const nonceToken = issueMobileNonceToken(nonce);
  if (!nonceToken) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }
  return NextResponse.json({ nonce, nonceToken });
}
