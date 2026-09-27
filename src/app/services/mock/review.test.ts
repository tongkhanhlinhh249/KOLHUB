import { beforeEach, describe, expect, test } from 'vitest';
import type { KolProfile, McnProfile, StoredFile } from '../profile-types';
import { createChannelService } from './channel';
import { createEkycService } from './ekyc';
import { createProfileService } from './profile';
import { findProfile } from './profileRules';
import { createReviewService, listApprovedKols, pendingChannelsOf } from './review';
import { makeHarness, type Harness } from './testHarness';

const png: StoredFile = { name: 'p.png', type: 'image/png', size: 100 };
const png2: StoredFile = { name: 'p2.png', type: 'image/png', size: 200 };
const ALL = [true, true, true];

let h: Harness;
let review: ReturnType<typeof createReviewService>;
let channels: ReturnType<typeof createChannelService>;
let profile: ReturnType<typeof createProfileService>;

beforeEach(() => {
  h = makeHarness();
  review = createReviewService({ db: h.db, now: h.now, notify: (m) => h.notices.push(m), delay: false });
  channels = createChannelService({ db: h.db, now: h.now, delay: false });
  profile = createProfileService({ db: h.db, now: h.now, delay: false });
});

function readyKol(hh: Harness): { c1: string; c2: string } {
  hh.db.update((s) => {
    const p = findProfile(s, hh.kolId) as KolProfile;
    Object.assign(p.contact, {
      displayName: 'Khánh Vy',
      province: 'Hà Nội',
      address: '1 Tràng Tiền',
      category: 'Giáo dục',
    });
    p.staff = { staffName: 'Lan', staffPhone: '0987654321', staffEmail: '' };
    p.ekycStatus = 'PASSED';
    s.identities.push({
      accountId: hh.kolId,
      fullName: 'KHÁNH VY',
      dob: '14/05/1996',
      idNoMasked: '079*******45',
      issueDate: '10/08/2021',
      ekycSessionId: 'x',
      verifiedAt: hh.clock.t,
    });
    const base = { ownerType: 'KOL' as const, ownerId: hh.kolId, proofImage: png, status: 'PENDING_REVIEW' as const, active: true, createdAt: 0, updatedAt: 0 };
    s.channels.push({ ...base, id: 'c1', platform: 'facebook', url: 'https://facebook.com/khanhvy', handle: 'khanhvy' });
    s.channels.push({ ...base, id: 'c2', platform: 'tiktok', url: 'https://tiktok.com/@khanhvy', handle: '@khanhvy' });
  });
  return { c1: 'c1', c2: 'c2' };
}

function readyMcn(hh: Harness) {
  hh.db.update((s) => {
    const p = findProfile(s, hh.mcnId) as McnProfile;
    Object.assign(p.contact, { displayName: 'MCN Sao', province: 'Hà Nội', address: '2 Hàng Bài', category: 'Giải trí' });
    p.org = { orgName: 'Công ty Sao', regNo: '0312345678', regDate: '2020-01-01', regBy: 'Sở KH&ĐT', legalRep: 'Nguyễn A' };
    p.gcnFile = { name: 'gcn.pdf', type: 'application/pdf', size: 100 };
  });
}

async function approvedKol(hh: Harness) {
  const ids = readyKol(hh);
  await review.submit(hh.kolId, ALL);
  await review.approve(hh.kolId, { c1: { verdict: 'PASS' }, c2: { verdict: 'NEEDS_FIX', reason: 'Ảnh mờ' } });
  return ids;
}

const status = () => findProfile(h.db.read(), h.kolId)!.status;

describe('submit', () => {
  test('chưa đủ điều kiện BR-64 → NOT_ELIGIBLE', async () =>
    await expect(review.submit(h.kolId, ALL)).rejects.toThrow('NOT_ELIGIBLE'));

  test('thiếu 1 cam đoan → NOT_ELIGIBLE', async () => {
    readyKol(h);
    await expect(review.submit(h.kolId, [true, true, false])).rejects.toThrow('NOT_ELIGIBLE');
  });

  test('gửi hai lần → lần hai NOT_SUBMITTABLE, chỉ 1 ReviewRequest', async () => {
    readyKol(h);
    await review.submit(h.kolId, ALL);
    await expect(review.submit(h.kolId, ALL)).rejects.toThrow('NOT_SUBMITTABLE');
    expect(h.db.read().reviewRequests).toHaveLength(1);
    expect(h.db.read().funnel.map((f) => f.step)).toEqual(['profile_submitted']);
  });

  test('MCN gửi được khi chưa có kênh (BR-65)', async () => {
    readyMcn(h);
    await expect(review.submit(h.mcnId, ALL)).resolves.toMatchObject({ status: 'SUBMITTED' });
  });
});

describe('approve / requestFix / reject', () => {
  test('duyệt: c1 Đạt, c2 Cần bổ sung → hồ sơ APPROVED, c1 dấu 12 tháng, c2 có lý do', async () => {
    const { c1, c2 } = readyKol(h);
    await review.submit(h.kolId, ALL);
    await review.approve(h.kolId, { [c1]: { verdict: 'PASS' }, [c2]: { verdict: 'NEEDS_FIX', reason: 'Ảnh không thấy tên kênh' } });
    const s = h.db.read();
    expect(findProfile(s, h.kolId)).toMatchObject({ status: 'APPROVED', kolId: 'KH900001' });
    expect(s.channels.find((c) => c.id === c1)).toMatchObject({
      status: 'VERIFIED',
      badgeExpiresAt: new Date(2027, 8, 27, 9, 0).getTime(),
    });
    expect(s.channels.find((c) => c.id === c1)!.followers).toBeGreaterThanOrEqual(10_000);
    expect(s.channels.find((c) => c.id === c2)).toMatchObject({ status: 'NEEDS_FIX', note: 'Ảnh không thấy tên kênh' });
    expect(h.notices.map((n) => n.channel)).toEqual(['email', 'sms', 'email', 'sms']);
    expect(h.notices[0]).toMatchObject({ target: 'kol@demo.kolhub.vn', title: 'Kết quả xét duyệt hồ sơ' });
    expect(h.notices[1].target).toBe('0912000001');
    expect(h.notices[0].body).toBe(
      'KOL Hub: Hồ sơ của bạn đã được duyệt. 1 kênh nhận dấu Kênh xác thực, hiệu lực đến 27/09/2027.',
    );
    expect(h.notices[2].body).toBe('KOL Hub: 1 kênh cần bổ sung. Vui lòng mở Quản lý kênh để xem lý do.');
    expect(s.reviewRequests[0]).toMatchObject({ status: 'APPROVED', decidedAt: h.clock.t });
  });

  test('Cần bổ sung không lý do → REASON_REQUIRED, không đổi gì', async () => {
    const { c1, c2 } = readyKol(h);
    await review.submit(h.kolId, ALL);
    await expect(
      review.approve(h.kolId, { [c1]: { verdict: 'PASS' }, [c2]: { verdict: 'NEEDS_FIX', reason: '  ' } }),
    ).rejects.toThrow('REASON_REQUIRED');
    expect(status()).toBe('SUBMITTED');
    expect(h.db.read().channels.every((c) => c.status === 'PENDING_REVIEW')).toBe(true);
  });

  test('thiếu verdict cho một kênh chờ → VERDICT_MISSING', async () => {
    const { c1 } = readyKol(h);
    await review.submit(h.kolId, ALL);
    await expect(review.approve(h.kolId, { [c1]: { verdict: 'PASS' } })).rejects.toThrow('VERDICT_MISSING');
  });

  test('KOL: mọi kênh Cần bổ sung → hồ sơ NEEDS_FIX, sửa kênh rồi gửi lại được', async () => {
    const { c1, c2 } = readyKol(h);
    await review.submit(h.kolId, ALL);
    await review.approve(h.kolId, {
      [c1]: { verdict: 'NEEDS_FIX', reason: 'a' },
      [c2]: { verdict: 'NEEDS_FIX', reason: 'b' },
    });
    expect(findProfile(h.db.read(), h.kolId)).toMatchObject({ status: 'NEEDS_FIX', decisionReason: 'Tất cả kênh cần bổ sung' });
    const u = await channels.update(h.kolId, c1, { url: 'https://facebook.com/khanhvy', proofImage: png2 });
    expect(u.status).toBe('PENDING_REVIEW');
    await expect(review.submit(h.kolId, ALL)).resolves.toMatchObject({ status: 'SUBMITTED' });
    expect(h.db.read().reviewRequests).toHaveLength(2);
    expect(findProfile(h.db.read(), h.kolId)!.decisionReason).toBeUndefined();
  });

  test('yêu cầu bổ sung hồ sơ: bắt buộc lý do, gửi tin nhắn', async () => {
    readyKol(h);
    await review.submit(h.kolId, ALL);
    await expect(review.requestFix(h.kolId, '')).rejects.toThrow('REASON_REQUIRED');
    await review.requestFix(h.kolId, 'Thiếu địa chỉ');
    expect(findProfile(h.db.read(), h.kolId)).toMatchObject({ status: 'NEEDS_FIX', decisionReason: 'Thiếu địa chỉ' });
    expect(h.notices[0].body).toBe('KOL Hub: Hồ sơ của bạn cần bổ sung. Lý do: Thiếu địa chỉ');
  });

  test('từ chối không lý do → REASON_REQUIRED; có lý do → REJECTED, tin nhắn chứa lý do', async () => {
    readyKol(h);
    await review.submit(h.kolId, ALL);
    await expect(review.reject(h.kolId, ' ')).rejects.toThrow('REASON_REQUIRED');
    await review.reject(h.kolId, 'Giấy tờ giả');
    expect(status()).toBe('REJECTED');
    expect(h.notices.map((n) => n.body)).toEqual([
      'KOL Hub: Hồ sơ của bạn không được duyệt. Lý do: Giấy tờ giả',
      'KOL Hub: Hồ sơ của bạn không được duyệt. Lý do: Giấy tờ giả',
    ]);
    expect(h.db.read().reviewRequests[0]).toMatchObject({ status: 'REJECTED', reason: 'Giấy tờ giả' });
  });

  test('từ chối hồ sơ chưa gửi → NOT_SUBMITTED', async () =>
    await expect(review.reject(h.kolId, 'x')).rejects.toThrow('NOT_SUBMITTED'));

  test('MCN duyệt → APPROVED, mcnId', async () => {
    readyMcn(h);
    await review.submit(h.mcnId, ALL);
    await review.approve(h.mcnId, {});
    expect(findProfile(h.db.read(), h.mcnId)).toMatchObject({ status: 'APPROVED', mcnId: 'MCN900001' });
  });

  test('hồ sơ APPROVED thêm kênh mới → approve chỉ đổi kênh, hồ sơ vẫn APPROVED, kolId giữ nguyên', async () => {
    await approvedKol(h);
    const c3 = await channels.add(h.kolId, { url: 'youtube.com/@khanhvy', proofImage: png });
    expect(pendingChannelsOf(h.db.read(), h.kolId).map((c) => c.id)).toEqual([c3.id]);
    h.notices.length = 0;
    await review.approve(h.kolId, { [c3.id]: { verdict: 'PASS' } });
    const s = h.db.read();
    expect(findProfile(s, h.kolId)).toMatchObject({ status: 'APPROVED', kolId: 'KH900001' });
    expect(s.channels.find((c) => c.id === c3.id)!.status).toBe('VERIFIED');
    expect(h.notices[0].body).toBe('KOL Hub: Kênh mới của bạn đã được duyệt. 1 kênh nhận dấu Kênh xác thực, hiệu lực đến 27/09/2027.');
  });

  test('KOL thứ hai được duyệt → KH900002', async () => {
    await approvedKol(h);
    h.db.update((s) => {
      s.accounts.push({ id: 'k2', type: 'KOL', email: 'k2@x.vn', phone: '0987000333', createdAt: '', password: 'x' });
    });
    await profile.getProfile('k2');
    h.db.update((s) => {
      const p = findProfile(s, 'k2') as KolProfile;
      Object.assign(p.contact, { displayName: 'K2', province: 'Hà Nội', address: 'a', category: 'Khác' });
      p.staff = { staffName: 'L', staffPhone: '0987654321', staffEmail: '' };
      p.ekycStatus = 'PASSED';
    });
    const c = await channels.add('k2', { url: 'tiktok.com/@k2', proofImage: png });
    await review.submit('k2', ALL);
    await review.approve('k2', { [c.id]: { verdict: 'PASS' } });
    expect(findProfile(h.db.read(), 'k2')).toMatchObject({ kolId: 'KH900002' });
  });
});

describe('listApprovedKols', () => {
  test('chỉ kênh VERIFIED, active, còn hạn; không lộ SĐT/CCCD', async () => {
    await approvedKol(h);
    const list = listApprovedKols(h.db.read(), h.now());
    expect(list).toEqual([
      {
        kolId: 'KH900001',
        displayName: 'Khánh Vy',
        avatar: undefined,
        category: 'Giáo dục',
        region: 'Hà Nội',
        verifiedAt: new Date(h.clock.t).toISOString(),
        channels: [
          {
            platform: 'facebook',
            url: expect.any(String),
            followers: expect.any(Number),
            badgeExpiresAt: new Date(2027, 8, 27, 9, 0).toISOString(),
          },
        ],
      },
    ]);
    expect(JSON.stringify(list)).not.toMatch(/0912000001|\*{7}/);
  });

  test('badgeExpiresAt === now → loại', async () => {
    await approvedKol(h);
    expect(listApprovedKols(h.db.read(), new Date(2027, 8, 27, 9, 0).getTime())).toEqual([]);
  });

  test('tắt kênh → loại', async () => {
    await approvedKol(h);
    await channels.setActive(h.kolId, 'c1', false);
    expect(listApprovedKols(h.db.read(), h.now())).toEqual([]);
  });

  test('hồ sơ không APPROVED → loại', async () => {
    await approvedKol(h);
    h.db.update((s) => {
      findProfile(s, h.kolId)!.status = 'NEEDS_FIX';
    });
    expect(listApprovedKols(h.db.read(), h.now())).toEqual([]);
  });

  test('expireChannelNow → EXPIRED, KOL rời listApprovedKols', async () => {
    await approvedKol(h);
    await review.expireChannelNow('c1');
    expect(h.db.read().channels.find((c) => c.id === 'c1')).toMatchObject({ status: 'EXPIRED', badgeExpiresAt: h.clock.t });
    expect(listApprovedKols(h.db.read(), h.now())).toEqual([]);
  });
});

describe('admin queue', () => {
  const org = { orgName: 'Công ty Sao', regNo: '0312345678', regDate: '2020-01-01', regBy: 'Sở KH&ĐT', legalRep: 'Nguyễn A' };

  test('hàng chờ có hồ sơ SUBMITTED kèm kênh chờ; DRAFT không vào', async () => {
    readyKol(h);
    await review.submit(h.kolId, ALL);
    const q = await review.listAdminQueue();
    expect(q.profiles.map((p) => p.ownerId)).toEqual([h.kolId]);
    expect(q.profiles[0]).toMatchObject({ ownerType: 'KOL', displayName: 'Khánh Vy', status: 'SUBMITTED' });
    expect(q.profiles[0].pendingChannels.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  test('hồ sơ APPROVED có kênh mới vào hàng chờ', async () => {
    await approvedKol(h);
    expect((await review.listAdminQueue()).profiles).toEqual([]);
    await channels.add(h.kolId, { url: 'youtube.com/@khanhvy', proofImage: png });
    expect((await review.listAdminQueue()).profiles.map((p) => p.status)).toEqual(['APPROVED']);
  });

  test('duyệt đổi Họ tên → hồ sơ hiển thị tên mới', async () => {
    readyKol(h);
    await review.submit(h.kolId, ALL);
    await profile.updateContact(h.kolId, { displayName: 'Vy Khánh' });
    const q = await review.listAdminQueue();
    expect(q.changes).toHaveLength(1);
    expect(q.changes[0]).toMatchObject({ displayName: 'Khánh Vy', field: 'displayName' });
    await review.decideChange(q.changes[0].id, { approve: true });
    const s = h.db.read();
    expect(findProfile(s, h.kolId)!.contact.displayName).toBe('Vy Khánh');
    expect(s.changeRequests[0]).toMatchObject({ status: 'APPROVED', decidedAt: h.clock.t });
    expect(h.notices.map((n) => n.body)).toEqual([
      'KOL Hub: Yêu cầu thay đổi Họ tên KOL/KOC đã được duyệt.',
      'KOL Hub: Yêu cầu thay đổi Họ tên KOL/KOC đã được duyệt.',
    ]);
    expect(h.notices[0].title).toBe('Kết quả duyệt thay đổi hồ sơ');
    expect((await review.listAdminQueue()).changes).toEqual([]);
  });

  test('từ chối đổi định danh MCN không lý do → REASON_REQUIRED; có lý do → org giữ nguyên, tin nhắn có lý do', async () => {
    readyMcn(h);
    await review.submit(h.mcnId, ALL);
    await profile.updateOrgIdentity(h.mcnId, { ...org, legalRep: 'Trần B' });
    const [chg] = (await review.listAdminQueue()).changes;
    await expect(review.decideChange(chg.id, { approve: false, reason: ' ' })).rejects.toThrow('REASON_REQUIRED');
    await review.decideChange(chg.id, { approve: false, reason: 'Chưa có GCN mới' });
    expect((findProfile(h.db.read(), h.mcnId) as McnProfile).org.legalRep).toBe('Nguyễn A');
    expect(h.notices[0].body).toBe(
      'KOL Hub: Yêu cầu thay đổi Thông tin định danh tổ chức không được duyệt. Lý do: Chưa có GCN mới',
    );
  });

  test('duyệt đổi định danh MCN → org và GCN mới', async () => {
    readyMcn(h);
    await review.submit(h.mcnId, ALL);
    await profile.uploadGcn(h.mcnId, { name: 'gcn2.pdf', type: 'application/pdf', size: 5 });
    await profile.updateOrgIdentity(h.mcnId, { ...org, legalRep: 'Trần B' });
    const [chg] = (await review.listAdminQueue()).changes;
    await review.decideChange(chg.id, { approve: true });
    expect(findProfile(h.db.read(), h.mcnId)).toMatchObject({ org: { legalRep: 'Trần B' }, gcnFile: { name: 'gcn2.pdf' } });
  });

  test('case 4103 chờ xem xét → accept-name → OCR_PASSED, tên theo CCCD', async () => {
    const ekyc = createEkycService({ db: h.db, now: h.now, delay: false });
    await profile.updateContact(h.kolId, { displayName: 'Khánh Vy' });
    ekyc.setScenario('KOLHUB-4103');
    await expect(ekyc.submitIdCard(h.kolId, { front: png, back: png })).rejects.toBeTruthy();
    await ekyc.resolveNameMismatch(h.kolId, 'request-review');
    const q = await review.listAdminQueue();
    expect(q.ekycCases).toEqual([
      expect.objectContaining({ accountId: h.kolId, displayName: 'Khánh Vy', status: 'MANUAL_REVIEW', ocr: expect.objectContaining({ fullName: 'TRẦN THỊ BÌNH' }) }),
    ]);
    await review.closeEkycCase(h.kolId, 'accept-name');
    const p = findProfile(h.db.read(), h.kolId) as KolProfile;
    expect(p).toMatchObject({ ekycStatus: 'OCR_PASSED', contact: { displayName: 'TRẦN THỊ BÌNH' }, ekycDraft: { nameMismatch: false } });
    expect(h.notices[0].body).toBe('KOL Hub: Yêu cầu xem xét eKYC đã được xử lý. Bạn có thể tiếp tục quay video khuôn mặt.');
  });

  test('case báo mạo danh → reset → NOT_STARTED, rời hàng chờ', async () => {
    const ekyc = createEkycService({ db: h.db, now: h.now, delay: false });
    await ekyc.reportImpersonation(h.kolId);
    expect((await review.listAdminQueue()).ekycCases.map((c) => c.status)).toEqual(['REPORTED']);
    await review.closeEkycCase(h.kolId, 'reset', 'Đã xác minh');
    expect((findProfile(h.db.read(), h.kolId) as KolProfile).ekycStatus).toBe('NOT_STARTED');
    expect((await review.listAdminQueue()).ekycCases).toEqual([]);
    expect(h.notices[0].body).toBe('KOL Hub: Yêu cầu xem xét eKYC đã được xử lý. Vui lòng xác thực lại. Lý do: Đã xác minh');
  });

  test('verifiedChannels liệt kê kênh có dấu để đẩy hết hạn', async () => {
    await approvedKol(h);
    const q = await review.listAdminQueue();
    expect(q.verifiedChannels.map((c) => [c.id, c.displayName])).toEqual([['c1', 'Khánh Vy']]);
  });
});
