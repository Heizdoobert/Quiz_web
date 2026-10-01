# lib/utils.ts
lines:46 exports:formatRelativeTime,downloadJson
---
const RELATIVE_TIME_UNITS: Array<[string, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/**
 * Formats an ISO timestamp as "3 days ago" style relative text, for
 * search results and topic lists.
 */
export function formatRelativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  for (const [unit, unitSeconds] of RELATIVE_TIME_UNITS) {
    const value = Math.floor(seconds / unitSeconds);
    if (value >= 1) return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
  }
  return 'just now';
}

/**
 * Safely triggers a browser download for a JSON-serializable payload as a file.
 * Handles Blob instantiation, DOM anchor injection, simulated click,
 * and delayed Object URL revocation to prevent premature cancellation in browsers.
 *
 * @param filename - The name of the file to save (e.g. 'backup.json')
 * @param data - The data object to serialize and download
 */
export function downloadJson(filename: string, data: unknown): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
