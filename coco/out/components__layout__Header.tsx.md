# components/layout/Header.tsx
lines:143 exports:default
---
"use client";

import React, { useContext, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Gift, Zap, Volume2, VolumeX, User, Trophy, Info } from "lucide-react";
import { useSoundToggle } from "@/hooks/shared/use-sound-toggle";
import { useSession } from "@/hooks/shared/use-session";
import SearchBox from "@/components/discovery/SearchBox";
import NoWalletNotice from "@/components/rewards/NoWalletNotice";
import { WalletHostContext } from "@/components/wallet/host-context";

// Pulls in wagmi and RainbowKit, so it loads only where the wallet stack is already
// mounted or after the player clicks Connect on a route without it.
const WalletConnect = dynamic(() => import("@/components/wallet/WalletConnect"), {
  ssr: false,
});

interface HeaderProps {
  onOpenRewards?: () => void;
  onOpenProfile?: () => void;
  hasClaimable?: boolean;
  heldTokens?: string;
  sweepsAt?: string | null;
}

export default function Header({
  onOpenRewards,
  onOpenProfile,
  hasClaimable,
  heldTokens,
  sweepsAt,
}: HeaderProps) {
  const { isMuted, handleToggleSound } = useSoundToggle();
  const { account } = useSession();
  const inWallet = useContext(WalletHostContext);
  const [connectRequested, setConnectRequested] = useState(false);
  const connectLabel = account && !account.wallet ? "Add wallet" : "Connect";

  return (
