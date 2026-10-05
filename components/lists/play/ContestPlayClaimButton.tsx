import React from "react";
import { Loader2, Coins, CheckCircle2 } from "lucide-react";

export type ClaimStep =
  "idle" | "signing" | "submitting" | "confirming" | "done" | "error";

export function ContestPlayClaimButton({
  isWrongChain,
  claimStep,
  claimError,
  isGasless,
  rewardAmount,
  onSwitchChain,
  onClaim,
  targetChainName,
}: {
  isWrongChain: boolean;
  claimStep: ClaimStep;
  claimError: string | null;
  isGasless: boolean;
  rewardAmount: string;
  onSwitchChain: () => void;
  onClaim: () => void;
  targetChainName: string;
}) {
  return (
    <div className="space-y-4">
      {isWrongChain ? (
        <button
          onClick={onSwitchChain}
          className="px-4 py-2 bg-pop-coral text-white rounded-xl font-bold text-sm cursor-pointer"
        >
          Switch to {targetChainName}
        </button>
      ) : claimStep === "done" ? (
        <p className="text-neo-mint font-bold text-sm flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> Reward claimed!
        </p>
      ) : (
        <button
          onClick={onClaim}
          disabled={
            claimStep === "signing" ||
            claimStep === "submitting" ||
            claimStep === "confirming" ||
            BigInt(rewardAmount) <= BigInt(0)
          }
          className="px-5 py-2.5 bg-linear-to-r from-neo-mint to-electric-indigo disabled:opacity-40 text-deep-space rounded-xl font-black text-sm flex items-center justify-center gap-2 mx-auto cursor-pointer"
        >
          {(claimStep === "signing" ||
            claimStep === "submitting" ||
            claimStep === "confirming") && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          <Coins className="w-4 h-4" /> Claim Reward
          {isGasless ? " (Gasless)" : ""}
        </button>
      )}
      {claimError && <p className="text-xs text-pop-coral">{claimError}</p>}
    </div>
  );
}
