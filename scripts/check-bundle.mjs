// Sums the gzip size of every script a prerendered page loads (`next build` with Turbopack prints
// no size table). Run after `npm run build`. Exits 1 when a page is over RATCHET_KB.
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const BUDGET_KB = 150; // CONSTRAINTS.md target for first-load JS
const RATCHET_KB = 570; // measured ceiling today (Sentry and PostHog added about 108 kB on 2026-10-09); lower it as weight leaves the routes
const APP_DIR = '.next/server/app';

const kb = (bytes) => (bytes / 1024).toFixed(1);
const pages = readdirSync(APP_DIR).filter((f) => f.endsWith('.html') && f !== '_global-error.html');
let failed = false;

for (const page of pages) {
  const html = readFileSync(join(APP_DIR, page), 'utf8');
  const scripts = new Set([...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1].split('?')[0]));
  let total = 0;
  for (const src of scripts) {
    total += gzipSync(readFileSync(join('.next', src.replace(/^\/_next\//, '')))).length;
  }
  const size = Number(kb(total));
  const verdict = size > RATCHET_KB ? 'FAIL (over ratchet)' : size > BUDGET_KB ? 'over budget' : 'ok';
  if (size > RATCHET_KB) failed = true;
  console.log(`${page.replace(/\.html$/, '').padEnd(16)} ${String(size).padStart(7)} kB gzip, ${scripts.size} scripts  ${verdict}`);
}

console.log(`budget ${BUDGET_KB} kB, ratchet ${RATCHET_KB} kB`);
process.exit(failed ? 1 : 0);
