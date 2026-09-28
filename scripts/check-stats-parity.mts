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
      .select('group_id, wallet_address')
      .order('group_id')
      .order('wallet_address')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

// The old leaderboard logic (score desc, accuracy desc), plus the wallet tie-break the SQL adds.
function oldLeaderboard(stats: Map<string, { correct: number; total: number }>, limit: number) {
  return [...stats.entries()]
    .map(([wallet, s]) => ({
      wallet_address: wallet,
      score: s.correct,
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }))
    .sort((a, b) => b.score - a.score || b.accuracy - a.accuracy || (a.wallet_address < b.wallet_address ? -1 : 1))
    .slice(0, limit);
}

// The old getUserStats logic, fed chronological rows for one wallet.
function oldUserStats(chronological: Row[]) {
  const totalAnswered = chronological.length;
  const correctCount = chronological.filter((r) => r.is_correct).length;
  let streak = 0;
  for (const r of [...chronological].reverse()) {
    if (r.is_correct) streak++;
    else break;
  }
  let bestStreak = 0;
  let run = 0;
  for (const r of chronological) {
    run = r.is_correct ? run + 1 : 0;
    if (run > bestStreak) bestStreak = run;
  }
  return { total_answered: totalAnswered, correct_count: correctCount, streak, best_streak: bestStreak };
}

const rows = await fetchAllResults();
const byWallet = new Map<string, Row[]>();
for (const r of rows) {
  const list = byWallet.get(r.wallet_address) ?? [];
  list.push(r);
  byWallet.set(r.wallet_address, list);
}

let mismatches = 0;
for (const [wallet, walletRows] of byWallet) {
  const expected = oldUserStats(walletRows);
  const { data, error } = await supabase.rpc('get_user_stats', { p_wallet: wallet }).single();
  if (error) throw error;
  if (JSON.stringify(data) !== JSON.stringify(expected)) {
    mismatches++;
    console.log(`user_stats MISMATCH ${wallet}\n  expected ${JSON.stringify(expected)}\n  got      ${JSON.stringify(data)}`);
  }
}

const totals = new Map<string, { correct: number; total: number }>();
for (const [wallet, walletRows] of byWallet) {
  totals.set(wallet, { correct: walletRows.filter((r) => r.is_correct).length, total: walletRows.length });
}

function compare(label: string, expected: unknown, got: unknown) {
  if (JSON.stringify(expected) !== JSON.stringify(got)) {
    mismatches++;
    console.log(`${label} MISMATCH\n  expected ${JSON.stringify(expected)}\n  got      ${JSON.stringify(got)}`);
  }
}

const LIMIT = 50;
const global = await supabase.rpc('get_global_leaderboard', { p_limit: LIMIT });
if (global.error) throw global.error;
compare('global_leaderboard', oldLeaderboard(totals, LIMIT), global.data);

const membersByGroup = new Map<string, string[]>();
for (const m of await fetchAllMembers()) {
  membersByGroup.set(m.group_id, [...(membersByGroup.get(m.group_id) ?? []), m.wallet_address]);
}
for (const [groupId, wallets] of membersByGroup) {
  const groupTotals = new Map(wallets.map((w) => [w, totals.get(w) ?? { correct: 0, total: 0 }]));
  const group = await supabase.rpc('get_group_leaderboard', { p_group_id: groupId, p_limit: LIMIT });
  if (group.error) throw group.error;
  compare(`group_leaderboard ${groupId}`, oldLeaderboard(groupTotals, LIMIT), group.data);
}

console.log(
  `${rows.length} rows, ${byWallet.size} wallets, ${membersByGroup.size} groups checked, ${mismatches} mismatches`
);
process.exit(mismatches > 0 ? 1 : 0);
