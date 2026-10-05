# app/sitemap.ts
lines:16 exports:default
---
import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const currentDate = new Date();

  return [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];
}
