import { Metadata, ResolvingMetadata } from 'next';
import Link from 'next/link';
import { verifySharePayload } from '@/lib/utils/crypto';

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

async function parseShareParams(searchParams: Props['searchParams']) {
  const params = await searchParams;
  const scoreStr = typeof params.score === 'string' ? params.score : '0';
  const totalStr = typeof params.total === 'string' ? params.total : '0';
  const quote = typeof params.quote === 'string' ? params.quote : '';
  const signature = typeof params.signature === 'string' ? params.signature : '';

  const score = parseInt(scoreStr, 10);
  const total = parseInt(totalStr, 10);
  const isValid = await verifySharePayload(score, total, quote, signature);
  
  return { scoreStr, totalStr, quote, signature, score, total, isValid };
}

export async function generateMetadata(
  { searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { scoreStr, totalStr, quote, signature, score, total, isValid } = await parseShareParams(searchParams);
  
  const previousImages = (await parent).openGraph?.images || [];

  if (!isValid) {
    return {
      title: 'Cheater Spotted - Quick Quiz',
      description: 'Someone tried to fake their quiz score!',
    };
  }

  // Construct absolute URL for the OG image
  // Fallback to localhost if not deployed
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  const searchString = new URLSearchParams({
    score: scoreStr,
    total: totalStr,
    quote,
    signature
  }).toString();

  const ogImageUrl = `${appUrl}/api/og/result?${searchString}`;

  return {
    title: `I scored ${score}/${total} on Quick Quiz!`,
    description: quote || 'Can you beat my score?',
    openGraph: {
      title: `I scored ${score}/${total} on Quick Quiz!`,
      description: quote || 'Can you beat my score?',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Score ${score}/${total}`,
        },
        ...previousImages,
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `I scored ${score}/${total} on Quick Quiz!`,
      description: quote || 'Can you beat my score?',
      images: [ogImageUrl],
    }
  };
}

export default async function ShareLandingPage({ searchParams }: Props) {
  const { score, total, isValid } = await parseShareParams(searchParams);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-6 text-center">
      <div className="max-w-md space-y-8">
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          {isValid ? `Can you beat ${score}/${total}?` : 'Nice try...'}
        </h1>
        
        <p className="text-xl text-slate-300">
          {isValid 
            ? "I challenge you to beat my score on Quick Quiz. Think you're smart enough?" 
            : "Looks like someone tried to edit the URL to fake a perfect score."}
        </p>

        <div className="pt-8 space-y-4">
          <Link href="/" className="inline-flex items-center justify-center w-full h-14 text-lg font-bold bg-white text-slate-950 rounded-lg hover:bg-slate-200 transition-colors">
            Play Now
          </Link>
        </div>
      </div>
    </div>
  );
}
