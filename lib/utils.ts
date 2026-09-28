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

  // Delay revocation to prevent browsers (e.g. Safari, Firefox) from aborting the download stream
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
