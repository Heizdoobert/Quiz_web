# components/admin/OwaspScanClient.tsx
lines:143 exports:OwaspAlert,OwaspScanResult,default
---
'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Loader2, ShieldAlert } from 'lucide-react';

export interface OwaspAlert {
  name: string;
  risk: string;
  description: string;
}

export interface OwaspScanResult {
  highAlerts: OwaspAlert[];
  reportUrl: string;
}

export default function OwaspScanClient() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<OwaspScanResult | null>(null);

  const runScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/owasp/scan', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Scan failed');
      }
      setResults(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred during scan.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

