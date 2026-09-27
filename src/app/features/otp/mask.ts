import type { OtpChannel } from '../../services';

/** 0912345678 → 0912***678; kol@demo.kolhub.vn → k***@demo.kolhub.vn */
export function maskTarget(channel: OtpChannel, target: string): string {
  const t = target.trim();
  if (channel === 'email') {
    const [user, domain] = t.split('@');
    if (!domain) return t;
    return `${user.charAt(0)}***@${domain}`;
  }
  const digits = t.replace(/[\s.]/g, '');
  if (digits.length < 7) return digits;
  return `${digits.slice(0, 4)}***${digits.slice(-3)}`;
}
