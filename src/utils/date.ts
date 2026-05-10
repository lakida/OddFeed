/**
 * Formatta una data ISO (YYYY-MM-DD) nel formato italiano gg/mm/aaaa.
 * Se la stringa non è una data valida, la restituisce invariata.
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateStr;
  return `${match[3]}/${match[2]}/${match[1]}`;
}
