'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';

const QUIZ_QUESTIONS = [
  { question: "What is Ethereum?", options: ["A country", "A cryptocurrency", "A blockchain platform", "A food"], correctIndex: 2 },
  { question: "What does EVM stand for?", options: ["Ethereum Virtual Machine", "External Value Maker", "Electronic Verification Module", "Every Validator Matters"], correctIndex: 0 },
  { question: "What is the native token of Base?", options: ["BASE", "ETH", "BTC", "OP"], correctIndex: 1 }
];

const CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890'; // Placeholder
const CONTRACT_ABI = [
  {
    "type": "function",
    "name": "submitAnswers",
    "inputs": [{ "name": "_userAnswers", "type": "uint8[]", "internalType": "uint8[]" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
] as const;

export function QuizInterface() {
  const { isConnected } = useAccount();
  const [answers, setAnswers] = useState<number[]>([]);
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const [verificationStatus, setVerificationStatus] = useState<string>('');

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (answers.length !== QUIZ_QUESTIONS.length || answers.includes(undefined as unknown as number)) {
      alert("Please answer all questions");
      return;
    }

    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'submitAnswers',
        args: [answers as readonly number[]],
      });
    } catch (err) {
      console.error(err);
    }
  };

  const verifyWithBackend = async () => {
    if (!hash) return;
    setVerificationStatus('Verifying...');
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionHash: hash })
      });
      const data = await res.json();
      if (data.success) {
        setVerificationStatus('Successfully verified and leaderboard updated!');
      } else {
        setVerificationStatus(`Verification failed: ${data.error}`);
      }
    } catch (e) {
      setVerificationStatus('Verification request failed.');
    }
  };

  if (!isConnected) {
    return <div className="p-8 text-center bg-gray-900 rounded-lg border border-gray-800">Please connect your wallet to play.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-900 rounded-xl shadow-lg border border-gray-800 text-white">
      <h2 className="text-3xl font-bold mb-6 text-neo-mint">Web3 Quiz</h2>
      
      {QUIZ_QUESTIONS.map((q, qIndex) => (
        <div key={qIndex} className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-xl font-semibold mb-3">{q.question}</h3>
          <div className="flex flex-col gap-2">
            {q.options.map((opt, oIndex) => (
              <label key={oIndex} className="flex items-center gap-3 p-3 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition">
                <input 
                  type="radio" 
                  name={`question-${qIndex}`} 
                  checked={answers[qIndex] === oIndex}
                  onChange={() => handleSelectOption(qIndex, oIndex)}
                  className="w-5 h-5 text-neo-mint"
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button 
        onClick={handleSubmit}
        disabled={isPending || isConfirming}
        className="w-full py-4 px-6 bg-neo-mint text-deep-space font-bold rounded-lg text-lg disabled:opacity-50 hover:bg-opacity-90 transition"
      >
        {isPending ? 'Confirming in Wallet...' : isConfirming ? 'Waiting for block...' : 'Submit Answers to Chain'}
      </button>

      {isConfirmed && (
        <div className="mt-6 p-4 bg-green-900/30 border border-green-500 rounded-lg text-center">
          <p className="text-green-400 font-semibold mb-3">Transaction Confirmed!</p>
          <button 
            onClick={verifyWithBackend} 
            className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded text-white font-bold"
          >
            Verify with Backend
          </button>
          {verificationStatus && <p className="mt-3 text-sm text-gray-300">{verificationStatus}</p>}
        </div>
      )}
    </div>
  );
}
