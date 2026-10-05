export interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

export const FAQ_DATA: FaqItem[] = [
  {
    category: 'Gameplay & Rewards',
    question: 'How do I earn $QUIZ cryptocurrency tokens?',
    answer:
      'Players earn 10 $QUIZ tokens for every trivia question answered correctly within the 30-second time limit. Token rewards accumulate in your dashboard and can be claimed directly into your Web3 wallet (MetaMask, Rainbow, Coinbase Wallet) via our on-chain reward contract on Base Sepolia.',
  },
  {
    category: 'Blockchain & Gas',
    question: 'Do I have to pay gas fees to play or submit answers?',
    answer:
      'Playing quiz questions is 100% free with zero gas fees. When claiming your accumulated $QUIZ tokens or minting Achievement NFT badges, the server signs a cryptographic EIP-712 voucher off-chain at zero cost to the platform. You only pay a sub-cent Layer 2 gas fee (~$0.001) on the Base network to submit your claim transaction.',
  },
  {
    category: 'NFT Badges',
    question: 'What are the Achievement Badge NFTs (QBADGE)?',
    answer:
      'Achievement Badges are ERC-721 non-fungible tokens minted on Base Sepolia celebrating your trivia milestones: Leaderboard Champion (Top 3 rank), Streak Fire (10+ consecutive correct answers), Century Quizzer (100+ questions answered), and Perfect Round. Each badge is unique to your wallet and permanently verifiable on-chain.',
  },
  {
    category: 'Anti-Cheat & Fairness',
    question: 'How does Quick Quiz prevent cheating and bots?',
    answer:
      'Our trivia platform evaluates answers strictly on server-side Next.js Server Actions. The correct answer index and explanation are never exposed in the client HTML/JavaScript bundles prior to submission. Furthermore, 50:50 power-ups utilize deterministic hashing to prevent brute-force exploitation.',
  },
  {
    category: 'Community & Clans',
    question: 'Can I create groups and contribute custom questions?',
    answer:
      'Yes! You can join or create trivia groups (clans) with dedicated guild leaderboards. Anyone can also submit custom crypto trivia questions through our community submission portal, featuring automatic heuristic quality checks and community dispute moderation.',
  },
];
