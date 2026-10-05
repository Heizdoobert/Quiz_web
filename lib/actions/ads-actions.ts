'use server';

import { supabase } from '@/lib/supabase/supabase';
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
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .eq('active', true);

    if (error) {
      logger.error('fetch_sponsors_failed', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Pick a random sponsor
    const randomIndex = Math.floor(Math.random() * data.length);
    return data[randomIndex] as Sponsor;
  } catch (error) {
    logger.error('fetch_sponsors_unexpected_error', error);
    return null;
  }
}
