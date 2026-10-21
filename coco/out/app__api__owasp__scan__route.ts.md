# app/api/owasp/scan/route.ts
lines:185 exports:dynamic,OwaspAlert,parseAlertsFromHtml,POST
---
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/sdk/supabase-ssr';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, access, unlink } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

export interface OwaspAlert {
  name: string;
  risk: string;
  description: string;
}

export function parseAlertsFromHtml(html: string): OwaspAlert[] {
  const alerts: OwaspAlert[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowContent = rowMatch[1];
    const cellMatches = Array.from(rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi));
    if (cellMatches.length >= 4) {
      const name = cellMatches[0][1].replace(/<[^>]+>/g, '').trim();
      const risk = cellMatches[1][1].replace(/<[^>]+>/g, '').trim();
      const description = cellMatches[3][1].replace(/<[^>]+>/g, '').trim();

      if (/High|Critical/i.test(risk)) {
        alerts.push({ name, risk, description });
      }
    }
  }

  return alerts;
}

