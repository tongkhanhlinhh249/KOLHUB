/**
 * Single "Email hoặc số điện thoại" field: digits with optional +, spaces, dots or dashes
 * count as a phone number; anything else (with "@" or letters) is treated as an email.
 */
export function looksLikePhone(v: string): boolean {
  const t = v.trim();
  return t.length > 0 && /^\+?[\d\s.\-]+$/.test(t);
}
