/**
 * Strips leading emoji and symbols from a string.
 * Used to clean article titles and category labels coming from Firestore.
 *
 * Examples:
 *   "🐙 Il polpo sogna..." → "Il polpo sogna..."
 *   "🐾 Animali"           → "Animali"
 *   "Hotel gestito da..."  → "Hotel gestito da..."  (unchanged)
 */
export function cleanText(text: string): string {
  if (!text) return '';
  // Remove any leading characters that are NOT letters (Latin + extended Latin)
  // This covers emoji, symbols, numbers at start, etc.
  return text.replace(/^[^a-zA-ZÀ-ÿÀ-ɏ]+/, '').trim();
}
