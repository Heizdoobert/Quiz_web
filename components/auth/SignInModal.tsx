'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from 'lucide-react';
import Modal from '@/components/Modal';

// Wallet connect + SIWE is the only sign-in method for now (Task 12 adds email).
// RainbowKitAuthenticationProvider (see Providers.tsx) drives the sign-message
// step automatically once the wallet connects, so this only needs the button.
export default function SignInModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sign in"
      icon={<Wallet className="w-5 h-5 text-[#00FFCC]" />}
    >
      <p className="text-sm text-slate-300 mb-5">
        Connect your wallet and sign a free message to sign in. This costs no gas.
      </p>
      <div className="flex justify-center">
        <ConnectButton label="Connect wallet" showBalance={false} />
      </div>
    </Modal>
  );
}
