import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Quick Quiz — Trivia Game & Leaderboards',
    short_name: 'QuickQuiz',
    description: 'Play, contribute, and compete on trivia leaderboards.',
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
