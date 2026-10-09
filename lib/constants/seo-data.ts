export interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

export const FAQ_DATA: FaqItem[] = [
  {
    category: 'Gameplay',
    question: 'How do I earn points?',
    answer:
      'Players earn 10 points for every trivia question answered correctly within the 30-second time limit. Points accumulate in your dashboard and determine your rank on the leaderboard.',
  },
  {
    category: 'Badges',
    question: 'What are the Achievement Badges?',
    answer:
      'Achievement Badges celebrate your trivia milestones: Leaderboard Champion (Top 3 rank), Streak Fire (10+ consecutive correct answers), Century Quizzer (100+ questions answered), and Perfect Round.',
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
      'Yes! You can join or create trivia groups (clans) with dedicated guild leaderboards. Anyone can also submit custom trivia questions through our community submission portal, featuring automatic heuristic quality checks and community dispute moderation.',
  },
];
