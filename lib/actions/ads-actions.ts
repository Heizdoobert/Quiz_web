'use server';

import { listActiveSponsors } from '@/lib/db/sponsors';
import { logger } from '@/lib/logger';

export interface Sponsor {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string | null;
  category: string;
}

export async function fetchRandomSponsor(): Promise<Sponsor | null> {
  try {
    const data = await listActiveSponsors();
    if (data.length === 0) return null;

    // Pick a random sponsor
    return data[Math.floor(Math.random() * data.length)] as Sponsor;
  } catch (error) {
    logger.error('fetch_sponsors_failed', error);
    return null;
  }
}
