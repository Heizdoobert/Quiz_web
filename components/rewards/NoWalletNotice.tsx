import React from 'react';
import { NO_WALLET_DISCLOSURE } from '@/lib/rewards-copy';

const TOKEN_DECIMALS = BigInt(10) ** BigInt(18);

// Held $QUIZ plus the disclosure, for accounts without a wallet
// (docs/specs/rewards-no-wallet-payee.md). Shown in RewardsModal and the header.
export default function NoWalletNotice({
  heldTokens,
  sweepsAt,
}: {
  heldTokens?: string;
  sweepsAt?: string | null;
}) {
  return (
    <div className="space-y-2 text-left">
      {heldTokens !== undefined && (
        <p className="text-sm text-white">
          Held for you:{' '}
          <span className="font-black text-[#FFD166]">{(BigInt(heldTokens || '0') / TOKEN_DECIMALS).toString()} $QUIZ</span>
        </p>
      )}
      {sweepsAt && (
        <p className="text-xs text-slate-300">
          Add a wallet before {new Date(sweepsAt).toLocaleDateString()} to keep your oldest held $QUIZ.
        </p>
      )}
      <p className="text-xs text-slate-400">{NO_WALLET_DISCLOSURE}</p>
    </div>
  );
}
