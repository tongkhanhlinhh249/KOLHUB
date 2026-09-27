import { describe, expect, test } from 'vitest';
import type { Channel, ChannelStatus } from '../profile-types';
import {
  channelHandle,
  countByFilter,
  detectPlatform,
  matchesFilter,
  normalizeChannelUrl,
  validateGcnFile,
  validateProofImage,
} from './channelRules';

describe('channelRules', () => {
  test.each([
    ['https://www.facebook.com/khanhvy.official', 'facebook'],
    ['fb.com/khanhvy', 'facebook'],
    ['m.facebook.com/abc', 'facebook'],
    ['youtube.com/@khanhvy', 'youtube'],
    ['https://youtu.be/abc', 'youtube'],
    ['tiktok.com/@khanhvy', 'tiktok'],
    ['vt.tiktok.com/ZS123', 'tiktok'],
    ['instagram.com/khanhvy', null],
    ['https://facebook.com/', null],
    ['khong phai link', null],
    ['', null],
  ])('detectPlatform %s', (u, p) => expect(detectPlatform(u)).toBe(p));

  test('normalizeChannelUrl gộp các cách viết', () => {
    const n = normalizeChannelUrl('https://www.facebook.com/abc/');
    expect(n).toBe('https://facebook.com/abc');
    expect(normalizeChannelUrl('facebook.com/abc?ref=x')).toBe(n);
    expect(normalizeChannelUrl('m.facebook.com/ABC#top')).toBe(n);
  });

  test('channelHandle lấy đoạn path đầu', () => {
    expect(channelHandle('tiktok.com/@khanhvy/video/1')).toBe('@khanhvy');
    expect(channelHandle('https://www.facebook.com/khanhvy.official/')).toBe('khanhvy.official');
  });

  test('ảnh 10 MB nhận, 10 MB + 1 và GIF → 4203', () => {
    expect(() => validateProofImage({ name: 'a.png', type: 'image/png', size: 10 * 1024 * 1024 })).not.toThrow();
    expect(() => validateProofImage({ name: 'a.png', type: 'image/png', size: 10 * 1024 * 1024 + 1 })).toThrow(
      expect.objectContaining({ code: 'KOLHUB-4203' }),
    );
    expect(() => validateProofImage({ name: 'a.gif', type: 'image/gif', size: 10 })).toThrow(
      expect.objectContaining({ code: 'KOLHUB-4203' }),
    );
  });

  test('GCN: sai loại kiểm trước dung lượng', () => {
    expect(() => validateGcnFile({ name: 'a.doc', type: 'application/msword', size: 20 * 1024 * 1024 })).toThrow(
      expect.objectContaining({ code: 'KOLHUB-4301' }),
    );
  });

  test('countByFilter: EXPIRED chỉ tính ở Tất cả', () => {
    const mk = (status: ChannelStatus) => ({ status }) as Channel;
    const chs = [mk('VERIFIED'), mk('PENDING_REVIEW'), mk('NEEDS_FIX'), mk('EXPIRED')];
    expect(countByFilter(chs)).toEqual({ all: 4, verified: 1, pending: 1, needs_fix: 1 });
    expect(matchesFilter(mk('EXPIRED'), 'all')).toBe(true);
    expect(matchesFilter(mk('EXPIRED'), 'verified')).toBe(false);
  });
});
