import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { PostHogProvider } from '@/components/providers/PostHogProvider';
import AdZone from '@/components/ads/AdZone';
import { FAQ_DATA } from '@/lib/constants/seo-data';
import { getSiteUrl } from '@/lib/utils/site-url';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const baseUrl = getSiteUrl();

const isPreview = process.env.VERCEL_ENV === 'preview' || process.env.NEXT_PUBLIC_APP_ENV === 'preview';

export const viewport: Viewport = {
  themeColor: '#00FFCC',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Quick Quiz — Trivia Game & Leaderboards',
    template: '%s | Quick Quiz',
  },
  description:
    'Challenge your knowledge with quick trivia questions, build answer streaks and climb the global leaderboard.',
  keywords: [
    'trivia game',
    'quiz game',
    'online quiz',
    'trivia leaderboard',
    'daily trivia',
  ],
  authors: [{ name: 'Quick Quiz Team', url: baseUrl }],
  creator: 'Quick Quiz Team',
  publisher: 'Quick Quiz',
  applicationName: 'Quick Quiz',
  category: 'game',
  classification: 'Educational Game',
  robots: isPreview
    ? {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      }
    : {
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
    title: 'Quick Quiz — Trivia Game & Leaderboards',
    description:
      'Test your knowledge, build answer streaks and climb the global trivia leaderboard.',
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
    title: 'Quick Quiz — Trivia Game & Leaderboards',
    description:
      'Test your knowledge, build answer streaks and climb the global trivia leaderboard.',
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
    description: 'Interactive trivia game with answer streaks and a global leaderboard.',
    inLanguage: 'en-US',
  };

  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Quick Quiz',
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
        <link rel="manifest" href="/manifest.json" />
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
        className={`${jetbrainsMono.variable} font-sans bg-deep-space text-slate-100 min-h-screen antialiased selection:bg-neo-mint selection:text-deep-space`}
      >
        <PostHogProvider>
          <Providers>
            <div className="flex justify-between max-w-480 mx-auto w-full relative">
              <AdZone variant="skyscraper" slot="global-left" className="hidden 2xl:flex sticky top-20 ml-4 my-8" />
              <div className="flex-1 w-full flex flex-col min-h-screen max-w-full overflow-x-hidden">
                {children}
              </div>
              <AdZone variant="skyscraper" slot="global-right" className="hidden 2xl:flex sticky top-20 mr-4 my-8" />
            </div>
          </Providers>
        </PostHogProvider>
      </body>
    </html>
  );
}
