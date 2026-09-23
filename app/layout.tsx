import type { Metadata } from 'next';
import { Orbitron, Exo_2 } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const exo2 = Exo_2({
  subsets: ['latin'],
  variable: '--font-exo2',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
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
      <body className={`${exo2.variable} ${orbitron.variable} ${exo2.className} bg-[#0A1128] text-slate-100 min-h-screen antialiased selection:bg-[#00FFCC] selection:text-[#0A1128]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
