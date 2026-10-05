import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils/site-url';

export default function robots(): MetadataRoute.Robots {
  const isPreview = process.env.VERCEL_ENV === 'preview' || process.env.NEXT_PUBLIC_APP_ENV === 'preview';
  const baseUrl = getSiteUrl();

  if (isPreview) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
