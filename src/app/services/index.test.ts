import { expect, test } from 'vitest';
import { authService, db, errorMessage, KolhubError, otpInbox, otpService } from './index';

test('services/index nối sẵn db, otp, auth và inbox', () => {
  expect(typeof authService.loginWithEmail).toBe('function');
  expect(typeof otpService.send).toBe('function');
  expect(typeof otpInbox.subscribe).toBe('function');
  expect(db.read().accounts).toHaveLength(43);
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
