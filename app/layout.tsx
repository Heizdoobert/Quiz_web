import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Quick Quiz | Web3 Interactive Trivia',
  description: 'Play, contribute, and compete on Web3 trivia leaderboards.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0A1128] text-slate-100 min-h-screen antialiased selection:bg-[#00FFCC] selection:text-[#0A1128]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
