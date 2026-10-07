import { describe, expect, test } from 'vitest';
import type { ScannedContent, ShieldState } from '../kol-safety-report-types';
import {
  decidedShield,
  effectiveShieldStatus,
  publicShieldOf,
  reevaluatedShield,
  requestedShield,
  shieldReasons,
  shieldViewOf,
  shieldWindow,
  windowPasses,
} from './contentShield';
import { createKolSafetyReportService } from './kolSafetyReport';
import { VERIFIED_KOL_EMAIL } from './seed';
import { makeHarness } from './testHarness';

const DAY = 86_400_000;
const T = new Date(2026, 9, 7, 10, 0).getTime();

const c = (id: string, verdict: ScannedContent['verdict']): ScannedContent => ({
  id,
  seq: 0,
  title: id,
  thumbnail: '',
  url: '',
  publishedAt: 0,
  durationSec: 30,
  views: 0,
  verdict,
  score: verdict === 'SAFE' ? 95 : verdict === 'GRAY' ? 60 : 20,
  findings: [],
});
const safe = (n: number, p = 's') => Array.from({ length: n }, (_, i) => c(`${p}${i}`, 'SAFE'));

describe('quy tắc 10 nội dung gần nhất', () => {
  test('đạt khi đủ 10, không Vi phạm, tối đa 2 Cần xem lại', () => {
    expect(windowPasses(shieldWindow(safe(10)))).toBe(true);
    expect(windowPasses(shieldWindow([c('g1', 'GRAY'), c('g2', 'GRAY'), ...safe(8)]))).toBe(true);
    expect(windowPasses(shieldWindow([c('g1', 'GRAY'), c('g2', 'GRAY'), c('g3', 'GRAY'), ...safe(7)]))).toBe(false);
    expect(windowPasses(shieldWindow([c('v', 'VIOLATION'), ...safe(9)]))).toBe(false);
    expect(windowPasses(shieldWindow(safe(9)))).toBe(false);
  });

  test('chỉ xét 10 nội dung mới nhất; nội dung "Đã gỡ bài" bị bỏ ra và nội dung kế tiếp được tính', () => {
    const items = [c('v', 'VIOLATION'), ...safe(10)];
    expect(shieldWindow(items)).toMatchObject({ total: 10, violation: 1, flaggedIds: ['v'] });
    expect(windowPasses(shieldWindow(items, ['v']))).toBe(true);
    expect(windowPasses(shieldWindow([...safe(10), c('old', 'VIOLATION')]))).toBe(true);
  });

  test('lý do chưa đạt', () => {
    expect(shieldReasons(shieldWindow([c('v', 'VIOLATION'), c('g1', 'GRAY'), c('g2', 'GRAY'), c('g3', 'GRAY'), ...safe(6)]))).toEqual([
      '1 nội dung Vi phạm trong 10 nội dung gần nhất (cần 0).',
      '3 nội dung Cần xem lại (tối đa 2).',
    ]);
  });
});

describe('vòng đời khiên', () => {
  test('xin khiên: đạt → ACTIVE, không đạt → FAILED', () => {
    expect(requestedShield(true, T)).toEqual({ status: 'ACTIVE', evaluatedAt: T, grantedAt: T });
    expect(requestedShield(false, T)).toEqual({ status: 'FAILED', evaluatedAt: T });
  });

  test('đang đạt mà có vi phạm mới → tạm treo 7 ngày; quá hạn → thu hồi; đạt lại → khôi phục', () => {
    const active = requestedShield(true, T);
    const suspended = reevaluatedShield(active, false, T + DAY)!;
    expect(suspended).toMatchObject({ status: 'SUSPENDED', deadline: T + DAY + 7 * DAY, grantedAt: T });
    expect(effectiveShieldStatus(suspended, T + 8 * DAY)).toBe('SUSPENDED');
    expect(effectiveShieldStatus(suspended, T + 9 * DAY)).toBe('REVOKED');
    const restored = reevaluatedShield(suspended, true, T + 2 * DAY)!;
    expect(restored).toMatchObject({ status: 'ACTIVE', grantedAt: T });
    expect(restored.deadline).toBeUndefined();
    // Đã thu hồi thì phải xin lại.
    expect(reevaluatedShield(suspended, true, T + 10 * DAY)!.status).toBe('REVOKED');
    expect(reevaluatedShield(undefined, true, T)).toBeUndefined();
  });

  test('khiếu nại: đang chờ thì hiện "Đang xét khiếu nại" và hạn tạm dừng; chấp nhận → ACTIVE, từ chối → giữ nguyên', () => {
    const suspended: ShieldState = { ...reevaluatedShield(requestedShield(true, T), false, T)!, appeal: { at: T, note: 'AI nhận nhầm', status: 'PENDING' } };
    expect(effectiveShieldStatus(suspended, T + 30 * DAY)).toBe('APPEALED');
    expect(publicShieldOf(suspended, T)).toBe('SUSPENDED');
    expect(decidedShield(suspended, true, 'Đã xem lại', T)).toMatchObject({ status: 'ACTIVE', appeal: { status: 'ACCEPTED', decisionNote: 'Đã xem lại' } });
    const rejected = decidedShield(suspended, false, undefined, T);
    expect(rejected).toMatchObject({ status: 'SUSPENDED', appeal: { status: 'REJECTED' } });
    expect(effectiveShieldStatus(rejected, T + 8 * DAY)).toBe('REVOKED');
  });

  test('quyền thao tác và phần Nhãn hàng thấy', () => {
    const items = [c('v', 'VIOLATION'), ...safe(10)];
    expect(shieldViewOf(undefined, items, [], false, T)).toMatchObject({ status: 'NONE', canRequest: false, channelVerified: false });
    expect(shieldViewOf(undefined, items, [], true, T)).toMatchObject({ canRequest: true, canMarkRemoved: false, canAppeal: false });
    const failed = shieldViewOf(requestedShield(false, T), items, [], true, T);
    expect(failed).toMatchObject({ status: 'FAILED', canAppeal: true, canMarkRemoved: true, canRequest: false });
    expect(publicShieldOf(requestedShield(true, T), T)).toBe('ACTIVE');
    expect(publicShieldOf(requestedShield(false, T), T)).toBeUndefined();
  });
});

describe('service KOL Safety: khiên, công tắc, gói', () => {
  function setup() {
    const h = makeHarness();
    const svc = createKolSafetyReportService({ db: h.db, now: h.now, delay: false });
    const kolId = h.db.read().accounts.find((a) => a.email === VERIFIED_KOL_EMAIL)!.id;
    return { ...h, svc, kolId };
  }

  test('xin khiên trên kênh đã xác thực; báo cáo trả trạng thái khiên', async () => {
    const { svc, kolId, db } = setup();
    const chans = await svc.listChannels(kolId);
    const verified = chans.find((x) => x.verified)!;
    const before = await svc.getReport(kolId, verified.id);
    expect(before.shield.status).toBe('NONE');
    const after = await svc.requestShield(kolId, verified.id);
    expect(after.shield.status).toBe(before.shield.passes ? 'ACTIVE' : 'FAILED');
    await expect(svc.requestShield(kolId, verified.id)).rejects.toMatchObject({ code: 'KOLHUB-4513' });
    const unverified = chans.find((x) => !x.verified);
    if (unverified) await expect(svc.requestShield(kolId, unverified.id)).rejects.toMatchObject({ code: 'KOLHUB-4512' });
    expect(db.read().kolSafetyReports?.find((r) => r.channelId === verified.id)?.shield).toBeDefined();
  });

  test('tắt KOL Safety: không quét, không xin khiên, thôi chia sẻ cho Nhãn hàng', async () => {
    const { svc, kolId } = setup();
    const [ch] = await svc.listChannels(kolId);
    await svc.setShared(kolId, ch.id, true);
    expect((await svc.setEnabled(kolId, false)).enabled).toBe(false);
    expect((await svc.getReport(kolId, ch.id)).shared).toBe(false);
    await expect(svc.rescan(kolId, ch.id)).rejects.toMatchObject({ code: 'KOLHUB-4510' });
    await expect(svc.requestShield(kolId, ch.id)).rejects.toMatchObject({ code: 'KOLHUB-4510' });
    await expect(svc.setShared(kolId, ch.id, true)).rejects.toMatchObject({ code: 'KOLHUB-4510' });
    expect((await svc.setEnabled(kolId, true)).enabled).toBe(true);
  });

  test('gói Miễn phí: 3 lượt quét lại mỗi kênh mỗi tháng; gói Bảo vệ không giới hạn', async () => {
    const { svc, kolId, clock } = setup();
    const [ch] = await svc.listChannels(kolId);
    expect((await svc.getSettings(kolId)).plan.key).toBe('FREE');
    expect((await svc.getReport(kolId, ch.id)).rescansLeft).toBe(3);
    for (let i = 0; i < 3; i++) {
      clock.t += 1000;
      await svc.rescan(kolId, ch.id);
    }
    expect((await svc.getReport(kolId, ch.id)).rescansLeft).toBe(0);
    await expect(svc.rescan(kolId, ch.id)).rejects.toMatchObject({ code: 'KOLHUB-4511' });
    await svc.setPlan(kolId, 'PROTECT');
    expect((await svc.getReport(kolId, ch.id)).rescansLeft).toBeUndefined();
    clock.t += 1000;
    expect((await svc.rescan(kolId, ch.id)).scanNo).toBe(5);
  });

  test('khiếu nại vào hàng chờ đội vận hành; chấp nhận → khiên ACTIVE', async () => {
    const { svc, kolId, db } = setup();
    const chans = await svc.listChannels(kolId);
    // Kênh đã xác thực mà 10 nội dung gần nhất chưa đạt; không có thì đánh dấu một kênh là đã xác thực để thử.
    let target: string | undefined;
    for (const ch of chans) if (!(await svc.getReport(kolId, ch.id)).shield.passes) target ??= ch.id;
    expect(target, 'cần một kênh có 10 nội dung gần nhất chưa đạt trong dữ liệu demo').toBeDefined();
    db.update((s) => {
      s.channels.find((x) => x.id === target)!.status = 'VERIFIED';
    });
    await svc.requestShield(kolId, target!);
    await expect(svc.appealShield(kolId, target!, '  ')).rejects.toMatchObject({ code: 'KOLHUB-4514' });
    const appealed = await svc.appealShield(kolId, target!, 'AI nhận nhầm sản phẩm');
    expect(appealed.shield.status).toBe('APPEALED');
    const queue = await svc.listShieldAppeals();
    expect(queue.map((q) => q.channelId)).toContain(target);
    await svc.decideShieldAppeal(kolId, target!, true, 'Đã xem lại video');
    expect((await svc.getReport(kolId, target!)).shield.status).toBe('ACTIVE');
    await expect(svc.decideShieldAppeal(kolId, target!, true)).rejects.toMatchObject({ code: 'KOLHUB-4513' });
  });
});
