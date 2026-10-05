import React, { useState } from 'react';
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract, useReadContract } from 'wagmi';
import { Rocket } from 'lucide-react';
import { startContest } from '@/lib/actions/question-list-actions';
import { getContestId, CONTEST_DURATION_SECONDS } from '@/lib/services/contest';
import { ContestEscrowABI } from '@/lib/contracts/ContestEscrowABI';
import { QuizTokenABI } from '@/lib/contracts/QuizTokenABI';
import { CONTEST_ESCROW_ADDRESS, QUIZ_TOKEN_ADDRESS, TARGET_CHAIN_ID, TARGET_CHAIN_NAME } from '@/lib/contracts/addresses';
import { useSession } from '@/hooks/shared/use-session';

const SIGN_IN_ERROR = 'Sign the message in your wallet to manage your lists.';

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
  const [poolAmount, setPoolAmount] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [funding, setFunding] = useState<null | 'approving' | 'creating'>(null);
  
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });
  const { address } = useAccount();

  const { data: quizBalanceData } = useReadContract({
    address: QUIZ_TOKEN_ADDRESS,
    abi: QuizTokenABI,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && listStatus === 'approved',
    }
  });

  const quizBalance = quizBalanceData ? Number(quizBalanceData) / 1e18 : 0;

  const handleStartContest = async () => {
    const amount = parseFloat(poolAmount);
    if (!amount || amount <= 0) {
      setError('Enter a positive reward pool amount (in QUIZ tokens).');
      return;
    }
    if (amount > quizBalance) {
      setError('Insufficient balance.');
      return;
    }
    const maxP = parseInt(maxParticipants, 10);
    if (isNaN(maxP) || maxP < 1 || maxP > 1000) {
      setError('Max participants must be between 1 and 1000.');
      return;
    }
    if (!(await ensureSession())) {
      setError(SIGN_IN_ERROR);
      return;
    }
    if (!account?.wallet) {
      setError('Add a wallet to your account to start contests.');
      return;
    }
    if (!address || address.toLowerCase() !== account.wallet.toLowerCase()) {
      setError(`Switch your connected wallet to ${account.wallet} to start this contest.`);
      return;
    }
    if (chainId !== TARGET_CHAIN_ID) {
      setError(`Switch to ${TARGET_CHAIN_NAME} to fund the contest on-chain.`);
      switchChain({ chainId: TARGET_CHAIN_ID });
      return;
    }
    if (!publicClient) {
      setError('Wallet network not ready. Try again.');
      return;
    }

    setError(null);
    try {
      const amountWei = BigInt(Math.floor(amount)) * (BigInt(10) ** BigInt(18));
      const contestId = getContestId(listId, account.wallet);

      let alreadyFunded = false;
      try {
        const contestData = await publicClient.readContract({
          address: CONTEST_ESCROW_ADDRESS,
          abi: ContestEscrowABI,
          functionName: 'contests',
          args: [contestId],
        });
        if (contestData && contestData[5] && contestData[2] >= amountWei) {
          alreadyFunded = true;
        }
      } catch {
        // contest doesn't exist yet on chain
      }

      if (!alreadyFunded) {
        setFunding('approving');
        const approveHash = await writeContractAsync({
          address: QUIZ_TOKEN_ADDRESS,
          abi: QuizTokenABI,
          functionName: 'approve',
          args: [CONTEST_ESCROW_ADDRESS, amountWei],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        setFunding('creating');
        const createHash = await writeContractAsync({
          address: CONTEST_ESCROW_ADDRESS,
          abi: ContestEscrowABI,
          functionName: 'createContest',
          args: [contestId, amountWei, BigInt(CONTEST_DURATION_SECONDS)],
        });
        await publicClient.waitForTransactionReceipt({ hash: createHash });
      }
    } catch (err) {
      console.error('Contest funding tx failed:', err);
      setError('On-chain funding failed or was rejected.');
      setFunding(null);
      return;
    }
    setFunding(null);
    
    // asSignedIn is just ensureSession + action in original code. We already ensureSession above.
    const res = await startContest(listId, amount, maxP);
    if (!res.success) {
      setError(res.error || 'Failed to start contest.');
      return;
    }
    onChanged();
  };

  if (listStatus !== 'approved') return null;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-[#6C5CE7]/10 border border-[#6C5CE7]/30 rounded-xl">
      <Rocket className="w-4 h-4 text-[#6C5CE7]" />
      <div className="flex flex-col">
        <span className="text-xs text-slate-300">Approved! Set a reward pool (QUIZ tokens) and start the contest:</span>
        <span className="text-[10px] text-slate-500">Balance: <span className="font-bold text-[#FFD166]">{quizBalance.toLocaleString()} QUIZ</span></span>
      </div>
      <input
        type="number"
        min={1}
        value={poolAmount}
        onChange={(e) => setPoolAmount(e.target.value)}
        placeholder="e.g. 500"
        className="w-28 px-2 py-1 bg-[#0A1128] border border-[#2D305A] rounded-lg text-white text-xs"
      />
      <span className="text-xs text-slate-300">Max Players:</span>
      <input
        type="number"
        min={1}
        max={1000}
        value={maxParticipants}
        onChange={(e) => setMaxParticipants(e.target.value)}
        className="w-20 px-2 py-1 bg-[#0A1128] border border-[#2D305A] rounded-lg text-white text-xs"
      />
      <button
        type="button"
        onClick={handleStartContest}
        disabled={funding !== null}
        className="px-3 py-1.5 bg-gradient-to-r from-[#00FFCC] to-[#6C5CE7] text-[#0A1128] rounded-lg text-xs font-black disabled:opacity-40 cursor-pointer"
      >
        {funding === 'approving' ? 'Approving QUIZ…' : funding === 'creating' ? 'Funding escrow…' : 'Start Contest'}
      </button>
    </div>
  );
}
