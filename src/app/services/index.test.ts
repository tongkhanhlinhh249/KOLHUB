import { expect, test } from 'vitest';
import { authService, db, errorMessage, KolhubError, otpInbox, otpService } from './index';

test('services/index nối sẵn db, otp, auth và inbox', () => {
  expect(typeof authService.loginWithEmail).toBe('function');
  expect(typeof otpService.send).toBe('function');
  expect(typeof otpInbox.subscribe).toBe('function');
  expect(db.read().accounts).toHaveLength(3);
  expect(new KolhubError('KOLHUB-4012').message).toBe(errorMessage('KOLHUB-4012'));
});
