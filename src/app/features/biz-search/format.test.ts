import { expect, test } from 'vitest';
import { formatCompactVi, formatDate, formatFollowers, initials } from './format';

test.each([
  [1_200_000, '1,2M'],
  [1_000_000, '1M'],
  [890_000, '890K'],
  [4_500, '4,5K'],
  [999, '999'],
  [0, '0'],
])('formatFollowers(%i)=%s', (n, s) => expect(formatFollowers(n)).toBe(s));

test('formatDate', () => expect(formatDate('2027-01-05T03:00:00.000Z')).toBe('05/01/2027'));

test('initials', () => {
  expect(initials('Châu Bùi')).toBe('CB');
  expect(initials('Đức Anh Tech')).toBe('ĐT');
  expect(initials('An')).toBe('A');
});

test.each([
  [11_800_000, '11,8 Tr'],
  [3_600_000_000, '3,6 Tỷ'],
  [1_000_000, '1 Tr'],
  [999_950, '1 Tr'],
  [999_950_000, '1 Tỷ'],
  [4_500, '4,5 K'],
  [890_000, '890 K'],
  [999, '999'],
  [0, '0'],
  [-5, '0'],
])('formatCompactVi(%i)=%s', (n, s) => expect(formatCompactVi(n)).toBe(s));
