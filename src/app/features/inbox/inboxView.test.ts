import { expect, test } from 'vitest';
import { badgeText, bubbleTime, parseNotificationFilter, shortTime, threadStatusTone } from './inboxView';

const now = new Date(2026, 9, 6, 15, 30).getTime();

test('giờ ngắn: hôm nay HH:mm, hôm qua, trong năm dd/MM, năm khác dd/MM/yyyy', () => {
  expect(shortTime(new Date(2026, 9, 6, 9, 5).getTime(), now)).toBe('09:05');
  expect(shortTime(new Date(2026, 9, 5, 23, 0).getTime(), now)).toBe('Hôm qua');
  expect(shortTime(new Date(2026, 8, 20, 8, 0).getTime(), now)).toBe('20/09');
  expect(shortTime(new Date(2025, 11, 31, 8, 0).getTime(), now)).toBe('31/12/2025');
  expect(bubbleTime(new Date(2026, 9, 6, 9, 5).getTime(), now)).toBe('09:05');
  expect(bubbleTime(new Date(2026, 9, 2, 9, 5).getTime(), now)).toBe('02/10 09:05');
});

test('số trên huy hiệu, màu trạng thái, bộ lọc thông báo', () => {
  expect(badgeText(0)).toBeNull();
  expect(badgeText(7)).toBe('7');
  expect(badgeText(120)).toBe('99+');
  expect(threadStatusTone('SENT')).toBe('warning');
  expect(threadStatusTone('CONTENT_REVIEW')).toBe('info');
  expect(threadStatusTone('COMPLETED')).toBe('success');
  expect(threadStatusTone('CANCELLED')).toBe('neutral');
  expect(parseNotificationFilter(new URLSearchParams('loc=chua-doc'))).toBe('unread');
  expect(parseNotificationFilter(new URLSearchParams())).toBe('all');
});
