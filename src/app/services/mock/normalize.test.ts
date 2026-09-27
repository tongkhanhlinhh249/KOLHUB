import { expect, test } from 'vitest';
import { isValidEmail, isValidPhone, normalizeEmail, normalizePhone } from './normalize';
import { errorMessage } from '../errors';
import { KolhubError } from '../types';

test.each([
  ['+84912345678', '0912345678'],
  ['84 912 345 678', '0912345678'],
  ['0912.345.678', '0912345678'],
  [' 0912345678 ', '0912345678'],
])('normalizePhone %s', (a, b) => expect(normalizePhone(a)).toBe(b));

test('normalizeEmail', () => expect(normalizeEmail(' Kol@Demo.VN ')).toBe('kol@demo.vn'));

test('isValidPhone từ chối đầu số 02', () => expect(isValidPhone('0212345678')).toBe(false));
test('isValidPhone chấp nhận +84 và đầu số di động', () => {
  expect(isValidPhone('+84912345678')).toBe(true);
  expect(isValidPhone('0381234567')).toBe(true);
  expect(isValidPhone('091234567')).toBe(false);
});

test('isValidEmail', () => {
  expect(isValidEmail(' Kol@Demo.VN ')).toBe(true);
  expect(isValidEmail('kol@demo')).toBe(false);
  expect(isValidEmail('kol demo@x.vn')).toBe(false);
  expect(isValidEmail('')).toBe(false);
});

test('KolhubError mang code và meta', () => {
  const e = new KolhubError('KOLHUB-4005', { attemptsLeft: 2 });
  expect(e).toBeInstanceOf(Error);
  expect(e.code).toBe('KOLHUB-4005');
  expect(e.meta).toEqual({ attemptsLeft: 2 });
  expect(e.message).toBe(errorMessage('KOLHUB-4005', { attemptsLeft: 2 }));
});

test('errorMessage chèn số lần thử và thời gian chờ', () => {
  expect(errorMessage('KOLHUB-4005', { attemptsLeft: 3 })).toContain('Còn 3 lần thử');
  expect(errorMessage('KOLHUB-4011', { attemptsLeft: 1 })).toContain('Còn 1 lần thử');
  expect(errorMessage('KOLHUB-4007', { retryAfterSec: 40 })).toContain('Thử lại sau 40 giây');
  expect(errorMessage('KOLHUB-4013', { retryAfterSec: 900 })).toContain('Thử lại sau 15 phút');
});
