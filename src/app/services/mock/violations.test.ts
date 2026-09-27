import { beforeEach, describe, expect, test } from 'vitest';
import { KolhubError } from '../types';
import type { SafetyMonitor } from '../safety-types';
import { createSafetyService } from './safety';
import { makeHarness, type Harness } from './testHarness';
import { VIOLATION_KOL_ACCOUNT_ID, VIOLATION_MCN_ACCOUNT_ID } from './violationSeed';
import { categoryOfIssue, countByStatus, createViolationService, syncViolationsFromMonitor } from './violations';

let h: Harness;
let svc: ReturnType<typeof createViolationService>;

const KV = VIOLATION_KOL_ACCOUNT_ID;
const SV = VIOLATION_MCN_ACCOUNT_ID;
const LONG = 'Nội dung đã được nhãn hàng cho phép sử dụng đầy đủ.';

beforeEach(() => {
  h = makeHarness();
  svc = createViolationService({ db: h.db, now: h.now, delay: false });
});

function signIn(accountId: string | null) {
  h.db.update((s) => {
    s.sessionAccountId = accountId;
  });
}

async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof KolhubError) return e.code;
    throw e;
  }
  return 'OK';
}

function firstOf(accountId: string, status: string) {
  const v = h.db.read().violations.find((x) => x.ownerId === accountId && x.status === status);
  if (!v) throw new Error(`no ${status} violation for ${accountId}`);
  return v;
}

describe('dữ liệu mẫu', () => {
  test('~20 vi phạm; Khánh Vy 5 (1 chờ, 2 cần xử lý, 1 khiếu nại, 1 đã khắc phục); Sao Việt 6', () => {
    const all = h.db.read().violations;
    expect(all.length).toBeGreaterThanOrEqual(18);
    const kv = countByStatus(all.filter((v) => v.ownerId === KV));
    expect(kv).toMatchObject({ all: 5, PENDING_REVIEW: 1, CONFIRMED: 2, APPEALED: 1, RESOLVED: 1, DISMISSED: 0 });
    const sv = all.filter((v) => v.ownerId === SV);
    expect(sv).toHaveLength(6);
    expect(new Set(sv.map((v) => v.channelHandle)).size).toBeGreaterThanOrEqual(4);
    expect(sv.every((v) => v.ownerType === 'MCN' && !v.kolId)).toBe(true);
    expect(all.filter((v) => v.ownerId === KV).every((v) => v.kolId === 'KOL-2026-0001')).toBe(true);
  });

  test('đủ nguồn, mức độ, nền tảng; ngày trong 90 ngày; id không trùng', () => {
    const all = h.db.read().violations;
    const t = Date.now();
    expect(new Set(all.map((v) => v.source))).toEqual(new Set(['KOL_SAFETY', 'REPORT']));
    expect(new Set(all.map((v) => v.severity))).toEqual(new Set(['high', 'medium', 'low']));
    expect(new Set(all.map((v) => v.platform))).toEqual(new Set(['facebook', 'youtube', 'tiktok']));
    expect(new Set(all.map((v) => v.id)).size).toBe(all.length);
    for (const v of all) {
      expect(v.detectedAt).toBeLessThanOrEqual(t);
      expect(t - v.detectedAt).toBeLessThan(91 * 86_400_000);
      expect(v.history[0].actor).toBe('system');
    }
  });
});

describe('chủ kênh (KOL/MCN)', () => {
  test('chỉ thấy vi phạm của mình, mới nhất trước', async () => {
    const list = await svc.listForOwner(KV);
    expect(list).toHaveLength(5);
    expect(list.every((v) => v.ownerId === KV)).toBe(true);
    for (let i = 1; i < list.length; i++) expect(list[i - 1].detectedAt).toBeGreaterThanOrEqual(list[i].detectedAt);
    expect(await svc.listForOwner('acc-kol-demo')).toEqual([]);
  });

  test('CONFIRMED → Đã khắc phục (RESOLVED) với ghi chú; ghi chú trống → 4607', async () => {
    const v = firstOf(KV, 'CONFIRMED');
    expect(await codeOf(svc.markResolved(KV, v.id, '   '))).toBe('KOLHUB-4607');
    const out = await svc.markResolved(KV, v.id, ' Đã gỡ video ');
    expect(out.status).toBe('RESOLVED');
    expect(out.ownerNote).toBe('Đã gỡ video');
    expect(out.history.at(-1)).toMatchObject({ actor: 'owner', action: 'RESOLVED', note: 'Đã gỡ video' });
  });

  test('khiếu nại: lý do < 20 ký tự → 4605; hợp lệ → APPEALED', async () => {
    const v = firstOf(KV, 'CONFIRMED');
    expect(await codeOf(svc.appeal(KV, v.id, 'quá ngắn'))).toBe('KOLHUB-4605');
    const out = await svc.appeal(KV, v.id, LONG);
    expect(out).toMatchObject({ status: 'APPEALED', appealReason: LONG, appealed: true });
  });

  test('sai trạng thái → 4602 (khắc phục/khiếu nại khi chờ xác minh, đã khiếu nại, đã khắc phục)', async () => {
    for (const st of ['PENDING_REVIEW', 'APPEALED', 'RESOLVED']) {
      const v = firstOf(KV, st);
      expect(await codeOf(svc.markResolved(KV, v.id, 'ok'))).toBe('KOLHUB-4602');
      expect(await codeOf(svc.appeal(KV, v.id, LONG))).toBe('KOLHUB-4602');
    }
  });

  test('không phải chủ → 4603; không tồn tại → 4601', async () => {
    const v = firstOf(KV, 'CONFIRMED');
    expect(await codeOf(svc.markResolved(SV, v.id, 'ok'))).toBe('KOLHUB-4603');
    expect(await codeOf(svc.appeal(SV, v.id, LONG))).toBe('KOLHUB-4603');
    expect(await codeOf(svc.markResolved(KV, 'nope', 'ok'))).toBe('KOLHUB-4601');
  });
});

describe('Admin', () => {
  test('hàng chờ gồm PENDING_REVIEW và APPEALED', async () => {
    const q = await svc.adminQueue();
    expect(q.pending.length).toBeGreaterThan(0);
    expect(q.pending.every((v) => v.status === 'PENDING_REVIEW')).toBe(true);
    expect(q.appealed.every((v) => v.status === 'APPEALED')).toBe(true);
    expect(q.appealed.length).toBeGreaterThanOrEqual(2);
    expect((await svc.listAll()).length).toBe(h.db.read().violations.length);
  });

  test('xác nhận: PENDING → CONFIRMED; lần hai → 4602', async () => {
    const v = firstOf(KV, 'PENDING_REVIEW');
    const out = await svc.confirm(v.id);
    expect(out.status).toBe('CONFIRMED');
    expect(out.history.at(-1)).toMatchObject({ actor: 'admin', action: 'CONFIRMED' });
    expect(await codeOf(svc.confirm(v.id))).toBe('KOLHUB-4602');
  });

  test('bác bỏ cần lý do (4604) → DISMISSED; chủ kênh không thao tác được nữa', async () => {
    const v = firstOf(KV, 'PENDING_REVIEW');
    expect(await codeOf(svc.dismiss(v.id, ' '))).toBe('KOLHUB-4604');
    const out = await svc.dismiss(v.id, 'Không đủ căn cứ');
    expect(out).toMatchObject({ status: 'DISMISSED', adminReason: 'Không đủ căn cứ' });
    expect(await codeOf(svc.markResolved(KV, v.id, 'x'))).toBe('KOLHUB-4602');
    expect(await codeOf(svc.dismiss(v.id, 'lại'))).toBe('KOLHUB-4602');
  });

  test('chấp nhận khiếu nại → DISMISSED; cần lý do', async () => {
    const v = firstOf(KV, 'APPEALED');
    expect(await codeOf(svc.acceptAppeal(v.id, ''))).toBe('KOLHUB-4604');
    const out = await svc.acceptAppeal(v.id, 'Đã có giấy phép');
    expect(out.status).toBe('DISMISSED');
    expect(out.history.at(-1)).toMatchObject({ action: 'APPEAL_ACCEPTED' });
  });

  test('từ chối khiếu nại → CONFIRMED; chủ chỉ còn khắc phục (khiếu nại lại → 4606)', async () => {
    const v = firstOf(KV, 'APPEALED');
    const out = await svc.rejectAppeal(v.id, 'Chưa có giấy phép');
    expect(out.status).toBe('CONFIRMED');
    expect(await codeOf(svc.appeal(KV, v.id, LONG))).toBe('KOLHUB-4606');
    expect((await svc.markResolved(KV, v.id, 'Đã thay nhạc')).status).toBe('RESOLVED');
  });

  test('thao tác khiếu nại trên mục không ở APPEALED → 4602; xác nhận mục đang khiếu nại → 4602', async () => {
    const c = firstOf(KV, 'CONFIRMED');
    expect(await codeOf(svc.acceptAppeal(c.id, 'x'))).toBe('KOLHUB-4602');
    expect(await codeOf(svc.rejectAppeal(c.id, 'x'))).toBe('KOLHUB-4602');
    expect(await codeOf(svc.confirm(firstOf(KV, 'APPEALED').id))).toBe('KOLHUB-4602');
  });
});

describe('Nhãn hàng (chỉ xem)', () => {
  test('chưa đăng nhập hoặc KOL → 4016', async () => {
    signIn(null);
    expect(await codeOf(svc.listForBrand())).toBe('KOLHUB-4016');
    signIn(KV);
    expect(await codeOf(svc.listForBrand())).toBe('KOLHUB-4016');
  });

  test('chỉ CONFIRMED/RESOLVED của KOL đã duyệt; không có MCN, ghi chú, lý do khiếu nại', async () => {
    signIn('acc-biz-demo');
    const list = await svc.listForBrand();
    expect(list.length).toBeGreaterThanOrEqual(8);
    expect(list.every((v) => v.status === 'CONFIRMED' || v.status === 'RESOLVED')).toBe(true);
    expect(list.some((v) => v.kolId === 'KOL-2026-0001')).toBe(true);
    expect(list.filter((v) => v.kolId === 'KOL-2026-0001')).toHaveLength(3);
    const json = JSON.stringify(list);
    for (const key of ['ownerNote', 'appealReason', 'adminReason', 'reporterNote', 'ownerId', 'note', 'phone', 'zalo', 'address'])
      expect(json).not.toContain(`"${key}"`);
    expect(json).not.toContain(VIOLATION_MCN_ACCOUNT_ID);
    for (const v of list) {
      expect(v.kolName).toBeTruthy();
      expect(v.history.every((e) => ['DETECTED', 'REPORTED', 'CONFIRMED', 'RESOLVED'].includes(e.action))).toBe(true);
    }
  });

  test('vi phạm của KOL chưa được duyệt không hiện với Nhãn hàng', async () => {
    signIn('acc-biz-demo');
    const before = (await svc.listForBrand()).filter((v) => v.kolId === 'KOL-2026-0001').length;
    h.db.update((s) => {
      s.kolProfiles.find((p) => p.accountId === KV)!.status = 'NEEDS_FIX';
    });
    expect(before).toBe(3);
    expect((await svc.listForBrand()).filter((v) => v.kolId === 'KOL-2026-0001')).toEqual([]);
  });

  test('khiếu nại / bác bỏ biến mất khỏi Nhãn hàng; xác nhận làm hiện ra', async () => {
    signIn('acc-biz-demo');
    const c = firstOf(KV, 'CONFIRMED');
    await svc.appeal(KV, c.id, LONG);
    expect((await svc.listForBrand()).some((v) => v.id === c.id)).toBe(false);
    const p = firstOf(KV, 'PENDING_REVIEW');
    expect((await svc.listForBrand()).some((v) => v.id === p.id)).toBe(false);
    await svc.confirm(p.id);
    expect((await svc.listForBrand()).some((v) => v.id === p.id)).toBe(true);
  });
});

describe('đồng bộ từ KOL Safety', () => {
  test('categoryOfIssue', () => {
    expect(categoryOfIssue('Quảng cáo chưa gắn nhãn #QuangCao theo Luật Quảng cáo')).toBe('Quảng cáo không gắn nhãn');
    expect(categoryOfIssue('Tuyên bố công dụng chưa được kiểm chứng')).toBe('Thông tin sai sự thật');
    expect(categoryOfIssue('Lộ thông tin cá nhân')).toBe('Lộ thông tin cá nhân');
    expect(categoryOfIssue('Âm thanh có bản quyền')).toBe('Vi phạm bản quyền');
  });

  test('mỗi video VIOLATION tạo 1 vi phạm PENDING_REVIEW nguồn KOL_SAFETY, không trùng khi đồng bộ lại', () => {
    const s = h.db.read();
    const m: SafetyMonitor = structuredClone(s.safetyMonitors.find((x) => x.accountId === KV)!);
    m.scannedVideos = m.scannedVideos.map((v, i) => ({ ...v, id: `t-${i}`, verdict: i < 2 ? 'VIOLATION' : 'SAFE' }));
    const before = s.violations.length;
    const added = syncViolationsFromMonitor(s, m, h.now());
    expect(added).toHaveLength(2);
    expect(added[0]).toMatchObject({
      status: 'PENDING_REVIEW',
      source: 'KOL_SAFETY',
      ownerId: KV,
      ownerType: 'KOL',
      kolId: 'KOL-2026-0001',
      platform: m.platform,
      scanVideoId: 't-0',
    });
    expect(syncViolationsFromMonitor(s, m, h.now())).toHaveLength(0);
    expect(s.violations.length).toBe(before + 2);
  });

  test('safetyService.scan tạo vi phạm cho các video vi phạm của lần quét', async () => {
    const safety = createSafetyService({ db: h.db, now: h.now, delay: false });
    const monitors = h.db.read().safetyMonitors.filter((x) => x.accountId === SV);
    let found = false;
    for (const mon of monitors) {
      for (let k = 0; k < 5 && !found; k++) {
        const out = await safety.scan(mon.id);
        const bad = out.scannedVideos.filter((v) => v.verdict === 'VIOLATION');
        const vios = h.db.read().violations.filter((v) => v.source === 'KOL_SAFETY' && v.ownerId === SV);
        for (const b of bad) expect(vios.some((v) => v.scanVideoId === b.id && v.status === 'PENDING_REVIEW')).toBe(true);
        if (bad.length) found = true;
      }
      if (found) break;
    }
    expect(found).toBe(true);
  });
});

describe('Nhãn hàng báo cáo vi phạm', () => {
  const NOTE = 'Video quảng cáo sữa nhưng không gắn nhãn quảng cáo ở phút 0:45.';
  const channelOf = (ownerId: string) => {
    const c = h.db.read().channels.find((x) => x.ownerId === ownerId && x.status === 'VERIFIED');
    if (!c) throw new Error(`no verified channel for ${ownerId}`);
    return c;
  };
  const input = (channelId: string, extra: Record<string, unknown> = {}) => ({
    channelId,
    category: 'Quảng cáo không gắn nhãn' as const,
    note: NOTE,
    ...extra,
  });

  test('tạo vi phạm PENDING_REVIEW nguồn REPORT, chủ kênh lấy từ kênh', async () => {
    signIn('acc-biz-demo');
    const c = channelOf(KV);
    const url = `https://${c.url.replace(/^https?:\/\//, '')}/video/123`;
    const v = await svc.reportByBrand(input(c.id, { contentUrl: url, severity: 'high' }));
    expect(v).toMatchObject({
      source: 'REPORT',
      status: 'PENDING_REVIEW',
      ownerId: KV,
      ownerType: 'KOL',
      kolId: 'KOL-2026-0001',
      platform: c.platform,
      channelId: c.id,
      contentUrl: url,
      contentTitle: 'Nội dung được báo cáo',
      severity: 'high',
      reporterNote: NOTE,
      detectedAt: h.now(),
    });
    expect(v.history).toEqual([{ at: h.now(), actor: 'reporter', action: 'REPORTED', note: 'Nhãn hàng gửi báo cáo' }]);
    expect(v.reporter).toEqual({ accountId: 'acc-biz-demo', company: 'Công ty Demo Sữa' });
  });

  test('không có link nội dung → tiêu đề "Kênh @handle", mức độ mặc định Trung bình; kênh MCN', async () => {
    signIn('acc-biz-demo');
    const c = channelOf(SV);
    const v = await svc.reportByBrand(input(c.id));
    expect(v).toMatchObject({ ownerId: SV, ownerType: 'MCN', severity: 'medium', contentTitle: `Kênh @${v.channelHandle}` });
    expect(v.kolId).toBeUndefined();
    expect(v.contentUrl).toBeUndefined();
  });

  test('chỉ tài khoản Nhãn hàng/Agency (4016)', async () => {
    const c = channelOf(KV);
    signIn(null);
    expect(await codeOf(svc.reportByBrand(input(c.id)))).toBe('KOLHUB-4016');
    signIn(SV);
    expect(await codeOf(svc.reportByBrand(input(c.id)))).toBe('KOLHUB-4016');
  });

  test('mô tả 20–1000 ký tự (4609); kênh không tồn tại (4611); loại vi phạm sai (4612); link khác nền tảng (4610)', async () => {
    signIn('acc-biz-demo');
    const c = channelOf(KV);
    expect(await codeOf(svc.reportByBrand(input(c.id, { note: '   ngắn quá   ' })))).toBe('KOLHUB-4609');
    expect(await codeOf(svc.reportByBrand(input(c.id, { note: 'x'.repeat(1001) })))).toBe('KOLHUB-4609');
    expect(await codeOf(svc.reportByBrand(input('nope')))).toBe('KOLHUB-4611');
    expect(await codeOf(svc.reportByBrand(input(c.id, { category: 'Khác' })))).toBe('KOLHUB-4612');
    const other = c.platform === 'youtube' ? 'https://tiktok.com/@x/video/1' : 'https://youtube.com/watch?v=1';
    expect(await codeOf(svc.reportByBrand(input(c.id, { contentUrl: other })))).toBe('KOLHUB-4610');
    expect(await codeOf(svc.reportByBrand(input(c.id, { contentUrl: 'không phải link' })))).toBe('KOLHUB-4610');
    expect(await codeOf(svc.reportByBrand(input(c.id, { note: 'x'.repeat(20) })))).toBe('OK');
  });

  test('trùng: cùng người báo cáo + kênh + link khi báo cáo trước còn chờ → 4608; sau khi Admin xử lý thì báo cáo lại được', async () => {
    signIn('acc-biz-demo');
    const c = channelOf(KV);
    const first = await svc.reportByBrand(input(c.id));
    expect(await codeOf(svc.reportByBrand(input(c.id)))).toBe('KOLHUB-4608');
    const url = `https://${c.url.replace(/^https?:\/\//, '')}/video/9`;
    expect(await codeOf(svc.reportByBrand(input(c.id, { contentUrl: url })))).toBe('OK');
    expect(await codeOf(svc.reportByBrand(input(c.id, { contentUrl: `${url}/` })))).toBe('KOLHUB-4608');
    await svc.dismiss(first.id, 'Không đủ căn cứ');
    expect(await codeOf(svc.reportByBrand(input(c.id)))).toBe('OK');
  });

  test('hiện trong hàng chờ Admin kèm thông tin người báo cáo', async () => {
    signIn('acc-biz-demo');
    const v = await svc.reportByBrand(input(channelOf(KV).id));
    const q = await svc.adminQueue();
    expect(q.pending.find((x) => x.id === v.id)?.reporter?.company).toBe('Công ty Demo Sữa');
  });

  test('chủ kênh thấy báo cáo nhưng không thấy danh tính người báo cáo', async () => {
    signIn('acc-biz-demo');
    const v = await svc.reportByBrand(input(channelOf(KV).id));
    const mine = (await svc.listForOwner(KV)).find((x) => x.id === v.id);
    expect(mine).toMatchObject({ source: 'REPORT', status: 'PENDING_REVIEW', reporterNote: NOTE });
    const json = JSON.stringify(mine);
    expect(json).not.toContain('"reporter":');
    expect(json).not.toContain('acc-biz-demo');
    expect(json).not.toContain('Công ty Demo Sữa');
    await svc.confirm(v.id);
    const out = await svc.markResolved(KV, v.id, 'Đã gỡ video');
    expect(JSON.stringify(out)).not.toContain('acc-biz-demo');
  });

  test('Nhãn hàng vẫn chỉ thấy CONFIRMED/RESOLVED; báo cáo chờ xác minh không hiện', async () => {
    signIn('acc-biz-demo');
    const v = await svc.reportByBrand(input(channelOf(KV).id));
    let list = await svc.listForBrand();
    expect(list.some((x) => x.id === v.id)).toBe(false);
    expect(list.every((x) => x.status === 'CONFIRMED' || x.status === 'RESOLVED')).toBe(true);
    await svc.confirm(v.id);
    list = await svc.listForBrand();
    const b = list.find((x) => x.id === v.id);
    expect(b).toBeTruthy();
    expect(JSON.stringify(b)).not.toContain('acc-biz-demo');
  });
});
