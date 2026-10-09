# components/lists/dashboard/ContestActionPanel.tsx
lines:200 exports:ContestActionPanel
---
import React, { useState } from "react";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
  useReadContract,
} from "wagmi";
import { Rocket } from "lucide-react";
import { startContest } from "@/lib/actions/question-list-actions";
import { getContestId, CONTEST_DURATION_SECONDS } from "@/lib/services/contest";
import { ContestEscrowABI } from "@/lib/contracts/ContestEscrowABI";
import { QuizTokenABI } from "@/lib/contracts/QuizTokenABI";
import {
  CONTEST_ESCROW_ADDRESS,
  QUIZ_TOKEN_ADDRESS,
  TARGET_CHAIN_ID,
  TARGET_CHAIN_NAME,
} from "@/lib/contracts/addresses";
import { useSession } from "@/hooks/shared/use-session";

const SIGN_IN_ERROR = "Sign the message in your wallet to manage your lists.";

export function ContestActionPanel({
  listId,
  listStatus,
  onChanged,
  setError,
}: {
  listId: string;
  listStatus: string;
  onChanged: () => void;
  setError: (err: string | null) => void;
}) {
  const { account, requireSignIn: ensureSession } = useSession();
  const [poolAmount, setPoolAmount] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("10");
  const [funding, setFunding] = useState<null | "approving" | "creating">(null);

