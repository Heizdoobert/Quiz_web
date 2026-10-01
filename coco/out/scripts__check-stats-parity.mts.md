# scripts/check-stats-parity.mts
lines:131 exports:
---
// Parity check: Postgres aggregation functions (lib/sql/stats-functions.sql)
// versus the JS aggregation they replaced, computed from every raw row.
//
// Run: NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... node scripts/check-stats-parity.mts
// Read-only. Exits 1 on any mismatch.
import { createClient } from '@supabase/supabase-js';

type Row = { wallet_address: string; is_correct: boolean; answered_at: string | null; id: string };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  process.exit(1);
}
const supabase = createClient(url, key);

// Page through with .range() so the 1000-row response cap never applies.
async function fetchAllResults(): Promise<Row[]> {
  const pageSize = 1000;
  const rows: Row[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('wallet_address, is_correct, answered_at, id')
      .order('answered_at', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data as Row[]));
    if (data.length < pageSize) return rows;
  }
}

async function fetchAllMembers(): Promise<{ group_id: string; wallet_address: string }[]> {
  const pageSize = 1000;
  const rows: { group_id: string; wallet_address: string }[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('group_members')
