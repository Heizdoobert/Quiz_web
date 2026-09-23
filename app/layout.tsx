import type { Metadata, Viewport } from 'next';
import { Orbitron, Exo_2 } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { FAQ_DATA } from '@/lib/seo-data';

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

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quickquiz.xyz';

export const viewport: Viewport = {
  themeColor: '#00FFCC',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Quick Quiz — Web3 Crypto Trivia & Learn-to-Earn Rewards',
    template: '%s | Quick Quiz',
  },
  description:
    'Challenge your crypto knowledge across DeFi, Layer 1s, and Smart Contracts. Earn on-chain $QUIZ tokens and NFT achievement badges on Base network.',
  keywords: [
    'crypto trivia',
    'web3 quiz',
    'learn to earn crypto',
    'base blockchain quiz',
    'base sepolia rewards',
    'blockchain trivia game',
    'defi quiz',
    'ethereum trivia',
    'smart contract quiz',
    'crypto quiz game',
  ],
  authors: [{ name: 'Quick Quiz Team', url: baseUrl }],
  creator: 'Quick Quiz Team',
  publisher: 'Quick Quiz Web3 Platform',
  applicationName: 'Quick Quiz',
  category: 'game',
  classification: 'Educational Web3 Game',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'Quick Quiz',
    title: 'Quick Quiz — Web3 Crypto Trivia & Learn-to-Earn Rewards',
    description:
      'Test your knowledge on DeFi, NFTs, and Layer 1 blockchains to earn on-chain $QUIZ token vouchers and achievement NFT badges on Base.',
    images: [
      {
        url: '/icon.svg',
        width: 512,
        height: 512,
        alt: 'Quick Quiz Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Quick Quiz — Web3 Crypto Trivia & Learn-to-Earn Rewards',
    description:
      'Test your knowledge on DeFi, NFTs, and Layer 1 blockchains to earn on-chain $QUIZ token vouchers and achievement NFT badges on Base.',
    images: ['/icon.svg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Quick Quiz',
    url: baseUrl,
    description: 'Interactive Web3 crypto trivia game with on-chain rewards on Base network.',
    inLanguage: 'en-US',
  };

  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Quick Quiz Web3 Platform',
    url: baseUrl,
    applicationCategory: 'EducationalGame',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_DATA.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema).replace(/</g, '\\u003c'),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webAppSchema).replace(/</g, '\\u003c'),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c'),
          }}
        />
      </head>
      <body
        className={`${exo2.variable} ${orbitron.variable} ${exo2.className} bg-[#0A1128] text-slate-100 min-h-screen antialiased selection:bg-[#00FFCC] selection:text-[#0A1128]`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
