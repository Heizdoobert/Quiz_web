import 'server-only';
import { pub } from './client';
import { unwrap } from './errors';

export async function listActiveSponsors(): Promise<unknown[]> {
  return unwrap('sponsors.active', await pub.from('sponsors').select('*').eq('active', true)) ?? [];
}
