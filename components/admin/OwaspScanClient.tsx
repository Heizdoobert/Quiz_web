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

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-xl border border-cyber-border bg-cyber-violet/20">
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="w-6 h-6 text-neo-mint" />
          <h1 className="text-2xl font-black font-heading text-white">
            OWASP ZAP Security Scan
          </h1>
        </div>
        <p className="text-sm text-slate-300 mb-6">
          Trigger an automated baseline vulnerability scan against the application, check for
          high-risk issues, and download the full report.
        </p>

        <div>
          <button
            type="button"
            onClick={runScan}
            disabled={loading}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-neo-mint text-black font-heading font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-mint shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running ZAP Scan...
              </>
            ) : (
              'Run ZAP Scan'
            )}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 p-4 rounded-lg bg-pop-coral/10 border border-pop-coral/30 text-pop-coral text-sm font-semibold flex items-start gap-2"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Scan Error</p>
              <p className="font-normal text-slate-200 mt-1">{error}</p>
            </div>
          </div>
        )}

        {results && (
          <div className="mt-8 pt-6 border-t border-cyber-border space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-bold font-heading text-white flex items-center gap-2">
                <span>Scan Findings</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyber-violet-light border border-cyber-border text-slate-300">
                  {results.highAlerts?.length ?? 0} High / Critical
                </span>
              </h2>

              {results.reportUrl && (
                <a
                  href={results.reportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-cyber-violet/60 border border-cyber-border text-neo-mint text-sm font-semibold hover:border-neo-mint hover:bg-cyber-violet transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Full Report (HTML)</span>
                </a>
              )}
            </div>

            {results.highAlerts && results.highAlerts.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-300">High / Critical Alerts</h3>
                <ul className="space-y-3">
                  {results.highAlerts.map((alert, index) => (
                    <li
                      key={index}
                      className="p-4 rounded-lg bg-cyber-violet/40 border border-pop-coral/40 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-white font-bold text-base">{alert.name}</strong>
                        <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-pop-coral/20 text-pop-coral border border-pop-coral/40">
                          {alert.risk}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{alert.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-neo-mint/10 border border-neo-mint/30 text-neo-mint flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">
                  No high or critical alerts found! The application passed the baseline scan without severe vulnerabilities.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
