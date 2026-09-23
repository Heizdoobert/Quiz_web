import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Quick Quiz — Web3 Crypto Trivia & Learn-to-Earn Rewards',
    short_name: 'QuickQuiz',
    description: 'Play, contribute, and compete on Web3 trivia leaderboards. Earn $QUIZ tokens and NFT badges on Base.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A1128',
    theme_color: '#00FFCC',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
