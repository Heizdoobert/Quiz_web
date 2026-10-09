'use client';

import { useContext, useEffect, useRef } from 'react';
import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit';
import WalletProviders from './WalletProviders';
import { WalletHostContext } from './host-context';

function OpenConnectModalOnce() {
  const { openConnectModal } = useConnectModal();
  const opened = useRef(false);
  // openConnectModal is undefined while wagmi is still reconnecting, so wait for it. Opening it in the
  // mount commit itself is swallowed by RainbowKit (measured in a browser), hence the timer. Opens once.
  useEffect(() => {
    if (opened.current || !openConnectModal) return;
    const timer = setTimeout(() => {
      opened.current = true;
      openConnectModal();
    }, 300);
    return () => clearTimeout(timer);
  }, [openConnectModal]);
  return null;
}

// The header's connect button. Below WalletProviders it renders directly; elsewhere it
// brings the wallet stack up around itself and opens the connect modal (the player clicked).
export default function WalletConnect({ label }: { label: string }) {
  const inWallet = useContext(WalletHostContext);
  const button = <ConnectButton label={label} showBalance={false} />;
  if (inWallet) return button;
  return (
    <WalletProviders>
      <OpenConnectModalOnce />
      {button}
    </WalletProviders>
  );
}
