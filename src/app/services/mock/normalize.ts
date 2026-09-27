/** Trim + lowercase so differently-cased emails match the same account. */
export function normalizeEmail(s: string): string {
  return (s ?? '').trim().toLowerCase();
}

/** Strip spaces/dots/dashes and turn a leading +84 / 84 into 0. */
export function normalizePhone(s: string): string {
  let p = (s ?? '').replace(/[\s.\-()]/g, '');
  if (p.startsWith('+84')) p = '0' + p.slice(3);
  else if (p.startsWith('84') && p.length === 11) p = '0' + p.slice(2);
  return p;
}

/** Vietnamese mobile number (03/05/07/08/09 + 8 digits) after normalisation. */
export function isValidPhone(s: string): boolean {
  return /^0(3|5|7|8|9)\d{8}$/.test(normalizePhone(s));
}

export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(s));
}
