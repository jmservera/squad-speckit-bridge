/**
 * Demo utility helpers
 */

/**
 * Generates a timestamp string in YYYYMMDD-HHMMSS format
 */
export function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * Formats a byte count as a human-readable string
 */
export function formatFileSize(bytes: number): string {
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

/**
 * Formats elapsed time in milliseconds as seconds
 */
export function formatElapsedTime(ms: number): string {
  const seconds = ms / 1000;
  return `${seconds.toFixed(1)}s`;
}
