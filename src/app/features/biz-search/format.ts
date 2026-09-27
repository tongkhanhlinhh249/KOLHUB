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
