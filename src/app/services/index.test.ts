import { expect, test } from 'vitest';
import { authService, db, errorMessage, KolhubError, otpInbox, otpService } from './index';

test('services/index nối sẵn db, otp, auth và inbox', () => {
  expect(typeof authService.loginWithEmail).toBe('function');
  expect(typeof otpService.send).toBe('function');
  expect(typeof otpInbox.subscribe).toBe('function');
  expect(db.read().accounts).toHaveLength(45);
  expect(new KolhubError('KOLHUB-4012').message).toBe(errorMessage('KOLHUB-4012'));
});

// --- phase 2 ---
test('services/index nối dịch vụ Đợt 2 và subscribeData báo khi dữ liệu đổi', async () => {
  const { ekycService, subscribeData } = await import('./index');
  let calls = 0;
  const off = subscribeData(() => calls++);
  ekycService.setScenario('KOLHUB-4101');
  off();
  expect(calls).toBe(1);
  expect(ekycService.getScenario()).toBe('KOLHUB-4101');
});

test('services/index xuất identityOf và DEMO_ACCOUNTS cho thanh chuyển vai trò', async () => {
  const { identityOf, DEMO_ACCOUNTS, authService: auth } = await import('./index');
  expect(identityOf(db.read(), null).roleLabel).toBe('Khách');
  expect(DEMO_ACCOUNTS.map((d) => d.key)).toContain('kol-verified');
  const vy = await auth.quickLogin('kol-verified');
  expect(identityOf(db.read(), vy)).toMatchObject({ name: 'Khánh Vy', subtitle: 'KOL-2026-0001' });
  await auth.logout();
});

test('safetyService được export cùng các kiểu KOL Safety', async () => {
  const { safetyService, MONITOR_PLATFORMS } = await import('./index');
  expect(typeof safetyService.uploadVideo).toBe('function');
  expect(MONITOR_PLATFORMS).toEqual(['tiktok', 'facebook', 'youtube']);
});

test('dịch vụ chiến dịch / booking / gói được export (beta)', async () => {
  const { campaignService, bookingService, planService, PLANS, BOOKING_STATUS_LABEL, errorMessage: msg } = await import('./index');
  expect(typeof campaignService.inviteKols).toBe('function');
  expect(typeof bookingService.submitDraft).toBe('function');
  expect(planService.listPlans()).toHaveLength(3);
  expect(PLANS[0].name).toBe('Dùng thử');
  expect(BOOKING_STATUS_LABEL.CONTENT_REVIEW).toBe('Chờ duyệt nội dung');
  expect(msg('KOLHUB-4803', { field: 'budget' })).toBe('Ngân sách không hợp lệ hoặc còn trống.');
  expect(msg('KOLHUB-4803', { field: 'cover' })).toBe('Ảnh chiến dịch phải là JPG, PNG hoặc WebP, tối đa 10 MB.');
});
