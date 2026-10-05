import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletTab() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-300">
        Connect your Web3 wallet and sign a free message to sign in. This costs no gas.
      </p>
      <div className="flex justify-center py-2">
        <ConnectButton label="Connect wallet" showBalance={false} />
      </div>
      <p className="text-xs text-slate-500 text-center">
        Supports MetaMask, Coinbase Wallet, Rainbow, and WalletConnect.
      </p>
    </div>
  );
}
