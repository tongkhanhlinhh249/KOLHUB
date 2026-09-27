import { format } from 'date-fns';

/** 1 200 000 → "1,2M", 890 000 → "890K", 4 500 → "4,5K", 999 → "999". */
export function formatFollowers(n: number): string {
  const fmt = (v: number, suffix: string) => {
    const r = Math.round(v * 10) / 10;
    return String(r).replace('.', ',') + suffix;
  };
  if (n >= 1_000_000) return fmt(n / 1_000_000, 'M');
  if (n >= 1_000) return fmt(n / 1_000, 'K');
  return String(n);
}

/**
 * Vietnamese short units for channel stats: 11 800 000 → "11,8 Tr", 3 600 000 000 → "3,6 Tỷ",
 * 4 500 → "4,5 K", 999 → "999". One decimal, trailing ",0" dropped.
 */
export function formatCompactVi(n: number): string {
  const v = Math.max(0, Math.round(n));
  const fmt = (x: number, unit: string) => {
    const r = Math.round(x * 10) / 10;
    return `${String(r).replace('.', ',')} ${unit}`;
  };
  // Rounding 999 950 → "1000 K" reads badly: promote to the next unit instead.
  if (v >= 999_950_000) return fmt(v / 1_000_000_000, 'Tỷ');
  if (v >= 999_950) return fmt(v / 1_000_000, 'Tr');
  if (v >= 1_000) return fmt(v / 1_000, 'K');
  return String(v);
}

/** ISO date → "dd/MM/yyyy" (local time). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return format(d, 'dd/MM/yyyy');
}

/** First letters of the first and last word, for avatar fallbacks. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = [...words[0]][0] ?? '';
  const last = words.length > 1 ? ([...words[words.length - 1]][0] ?? '') : '';
  return (first + last).toUpperCase();
}
