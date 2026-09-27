import { describe, expect, test } from 'vitest';
import type { FunnelEvent, FunnelStep } from '../profile-types';
import { createDb } from './db';
import { buildFunnel, createFunnelService, formatDuration, FUNNEL_STEPS, trackFunnel } from './funnel';
import { seedState } from './seed';

const ev = (step: FunnelStep, at: number, subject = 'kol@x.vn'): FunnelEvent => ({ subject, step, at });

describe('funnel', () => {
  test('chỉ ghi lần đầu mỗi bước, subject chuẩn hoá', () => {
    const s = seedState();
    trackFunnel(s, ' KOL@x.vn ', 'register_started', 1000);
    trackFunnel(s, 'kol@x.vn', 'register_started', 5000);
    expect(s.funnel).toEqual([{ subject: 'kol@x.vn', step: 'register_started', at: 1000 }]);
  });

  test('FUNNEL_STEPS đủ 7 bước theo thứ tự', () =>
    expect(FUNNEL_STEPS.map((f) => f.step)).toEqual([
      'register_started',
      'otp_email_verified',
      'otp_sms_verified',
      'ekyc_ocr_passed',
      'ekyc_face_passed',
      'channel_added',
      'profile_submitted',
    ]));

  test('buildFunnel: khoảng cách tính từ mốc đã có gần nhất, bỏ qua mốc thiếu', () => {
    const f = buildFunnel(
      [ev('register_started', 0), ev('otp_email_verified', 30_000), ev('ekyc_ocr_passed', 150_000), ev('register_started', 9, 'other@x.vn')],
      'kol@x.vn',
    );
    expect(f.map((x) => x.sincePrevMs)).toEqual([undefined, 30_000, undefined, 120_000, undefined, undefined, undefined]);
    expect(f[0]).toMatchObject({ label: 'Bắt đầu đăng ký', at: 0 });
  });

  test.each([
    [500, 'dưới 1 giây'],
    [45_000, '45 giây'],
    [125_000, '2 phút 5 giây'],
    [3_780_000, '1 giờ 3 phút'],
    [3_600_000, '1 giờ'],
  ])('formatDuration %i', (ms, s) => expect(formatDuration(ms)).toBe(s));

  test('service: track, subjects mới nhất trước, get', () => {
    let t = 1000;
    const svc = createFunnelService({ db: createDb(null, seedState), now: () => t });
    svc.track('a@x.vn', 'register_started');
    t = 2000;
    svc.track('B@x.vn', 'register_started');
    t = 3000;
    svc.track('a@x.vn', 'otp_email_verified');
    expect(svc.subjects()).toEqual(['a@x.vn', 'b@x.vn']);
    expect(svc.get('a@x.vn')[1]).toMatchObject({ at: 3000, sincePrevMs: 2000 });
  });
});
