// eslint-disable-next-line no-restricted-imports
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type System = {
  id: string;
  name: string;
  type: string;
  status: Record<string, unknown>;
  last_updated: string;
};

export async function fetchSystems(): Promise<System[]> {
  const { data, error } = await supabase
    .from('systems')
    .select('*');
  if (error) {
    console.error('Error fetching systems:', error);
    return [];
  }
  return data as System[];
}
