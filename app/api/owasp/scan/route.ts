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

export async function POST(_req: Request) {
  try {
    // 1. Authenticate user via @supabase/ssr and cookies()
    const cookieStore = await cookies();
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      'https://placeholder.supabase.co';
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      'placeholder-anon-key';

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignored in route handler
          }
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Check admin email whitelist
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const userEmail = user.email.trim().toLowerCase();
    if (!adminEmails.includes(userEmail)) {
      return NextResponse.json({ error: 'Forbidden - admin only' }, { status: 403 });
    }

    // 3. Setup scan parameters
    const targetUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'http://host.docker.internal:3000';
    const reportFileName = `zap-report-${Date.now()}.html`;
    const reportFilePath = path.join('/tmp', reportFileName);

    const zapCmd = `docker run --rm -v /tmp:/zap/wrk zaproxy/zap2docker-stable zap-baseline.py -t ${targetUrl} -r ${reportFileName}`;

    // 4. Execute scan
    try {
      await execAsync(zapCmd, { timeout: 5 * 60 * 1000 });
    } catch (execError: unknown) {
      // zap-baseline.py exits with code 1 (WARN) or 2 (FAIL) when alerts are found.
      // Check if report file exists before failing.
      try {
        await access(reportFilePath);
      } catch {
        const errorMsg =
          execError instanceof Error ? execError.message : String(execError);
        console.error('ZAP execution error:', execError);
        return NextResponse.json(
          { error: 'ZAP scan failed', details: errorMsg },
          { status: 500 }
        );
      }
    }

    // 5. Read generated report
    let reportHtml: string;
    try {
      reportHtml = await readFile(reportFilePath, 'utf8');
    } catch (readError: unknown) {
      const errorMsg =
        readError instanceof Error ? readError.message : String(readError);
      console.error('Failed to read ZAP report:', readError);
      return NextResponse.json(
        { error: 'Failed to read ZAP report', details: errorMsg },
        { status: 500 }
      );
    }

    // 6. Parse high and critical alerts
    const highAlerts = parseAlertsFromHtml(reportHtml);

    // 7. Upload report to Supabase storage bucket 'owasp-reports'
    let storageClient: typeof supabase = supabase;
    if (process.env.SUPABASE_SECRET_KEY) {
      try {
        const { supabaseAdmin } = await import('@/lib/sdk/supabase-admin');
        if (supabaseAdmin) storageClient = supabaseAdmin;
      } catch {
        storageClient = supabase;
      }
    }

    const { error: uploadError } = await storageClient.storage
      .from('owasp-reports')
      .upload(reportFileName, Buffer.from(reportHtml), {
        contentType: 'text/html',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload report to storage', details: uploadError.message },
        { status: 500 }
      );
    }

    // 8. Retrieve public URL
    const { data: publicUrlData } = storageClient.storage
      .from('owasp-reports')
      .getPublicUrl(reportFileName);

    // 9. Cleanup temporary report file
    try {
      await unlink(reportFilePath);
    } catch (cleanupError) {
      console.warn('Failed to delete temporary ZAP report:', cleanupError);
    }

    return NextResponse.json({
      highAlerts,
      reportUrl: publicUrlData.publicUrl,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Unexpected error in OWASP scan route:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMsg },
      { status: 500 }
    );
  }
}
