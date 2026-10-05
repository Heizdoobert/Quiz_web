'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

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
      console.error('Error fetching sponsors:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // Pick a random sponsor
    const randomIndex = Math.floor(Math.random() * data.length);
    return data[randomIndex] as Sponsor;
  } catch (error) {
    console.error('Failed to fetch sponsors:', error);
    return null;
  }
}
