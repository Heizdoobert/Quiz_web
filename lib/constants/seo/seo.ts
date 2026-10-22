export interface FaqItem {
  category: string;
  question: string;
  answer: string;
}

export const FAQ_DATA: FaqItem[] = [
  {
    category: 'Gameplay & Scoring',
    question: 'How does scoring work?',
    answer:
      'Every question answered correctly earns one point, and consecutive correct answers build a streak. Your score, accuracy and best streak are saved to your account and ranked on the global leaderboard.',
  },
  {
    category: 'Accounts',
    question: 'Do I need an account to play?',
    answer:
      'You can play without one, but answers only count toward your score when you are signed in. Sign in with a username and password or an email code to save your progress, add questions and join groups.',
  },
  {
    category: 'Anti-Cheat & Fairness',
    question: 'How does Quick Quiz prevent cheating and bots?',
    answer:
      'Our trivia platform evaluates answers strictly on server-side Next.js Server Actions. The correct answer index and explanation are never exposed in the client HTML/JavaScript bundles prior to submission. Furthermore, 50:50 power-ups utilize deterministic hashing to prevent brute-force exploitation.',
  },
  {
    category: 'Community & Groups',
    question: 'Can I create groups and contribute custom questions?',
    answer:
      'Yes! You can join or create trivia groups with dedicated group leaderboards. Anyone signed in can also submit custom trivia questions through our community submission portal, featuring automatic heuristic quality checks and community dispute moderation.',
  },
];
