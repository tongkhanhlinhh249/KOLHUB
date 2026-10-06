// Pure helpers of "Tin nhắn" / "Thông báo": short times, badge text, status tone of a thread.
import type { BookingStatus, NotificationFilter } from '../../services';
import { CLOSED_STATUSES } from '../../services';
import type { Tone } from '../shared/StatusBadges';

const p2 = (n: number) => String(n).padStart(2, '0');
const DAY = 86_400_000;

function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Inbox / notification time: "14:05" today, "Hôm qua" yesterday, "dd/MM" this year, else "dd/MM/yyyy". */
export function shortTime(ms: number, now: number): string {
  const d = new Date(ms);
  const today = startOfDay(now);
  if (ms >= today) return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  if (ms >= today - DAY) return 'Hôm qua';
  if (d.getFullYear() === new Date(now).getFullYear()) return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}`;
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Message bubble time: "14:05" today, else "dd/MM HH:mm". */
export function bubbleTime(ms: number, now: number): string {
  const d = new Date(ms);
  const hm = `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  return ms >= startOfDay(now) ? hm : `${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${hm}`;
}

/** Badge text: 1–99, then "99+"; null for 0. */
export function badgeText(n: number): string | null {
  if (!n || n < 0) return null;
  return n > 99 ? '99+' : String(n);
}

export function threadStatusTone(s: BookingStatus): Tone {
  if (CLOSED_STATUSES.includes(s)) return 'neutral';
  if (s === 'COMPLETED') return 'success';
  if (s === 'SENT' || s === 'APPLIED' || s === 'NEGOTIATING') return 'warning';
  return 'info';
}

export const THREAD_PARAM = 'thread';
export const NOTIFICATION_FILTER_PARAM = 'loc';

/** ?loc=chua-doc → unread only. */
export const parseNotificationFilter = (p: URLSearchParams): NotificationFilter => (p.get(NOTIFICATION_FILTER_PARAM) === 'chua-doc' ? 'unread' : 'all');
