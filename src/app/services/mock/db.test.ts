import { describe, expect, test } from 'vitest';
import { createDb, DB_KEY } from './db';
import { seedState } from './seed';

function memoryStorage(init: Record<string, string>) {
  const data = new Map(Object.entries(init));
  return {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe('createDb', () => {
  test('key is kolhub-demo-v1', () => expect(DB_KEY).toBe('kolhub-demo-v1'));

  test('reset về seed khi JSON hỏng', () => {
    const mem = memoryStorage({ 'kolhub-demo-v1': '{not json' });
    const db = createDb(mem, seedState);
    expect(db.read().accounts).toHaveLength(45);
  });

  test('reset về seed khi sai version', () => {
    const mem = memoryStorage({ 'kolhub-demo-v1': JSON.stringify({ version: 0 }) });
    expect(createDb(mem, seedState).read().version).toBe(15);
  });

  test('dữ liệu v2 cũ → thay bằng seed v4 (có MCN đã xác thực), ghi đè storage', () => {
    const v2 = { ...seedState(), version: 2, sessionAccountId: 'acc-kol-demo' };
    const mem = memoryStorage({ 'kolhub-demo-v1': JSON.stringify(v2) });
    const s = createDb(mem, seedState).read();
    expect(s.version).toBe(15);
    expect(s.sessionAccountId).toBeNull();
    expect(s.accounts.some((a) => a.email === 'saoviet@demo.kolhub.vn')).toBe(true);
    expect(JSON.parse(mem.getItem('kolhub-demo-v1')!).version).toBe(15);
  });

  test('dữ liệu v1 hợp lệ (có directory) → thay bằng seed v4, ghi đè storage', () => {
    const v1 = { ...seedState(), version: 1, directory: [{ kolId: 'KOL-2026-0001' }], sessionAccountId: 'acc-kol-demo' };
    const mem = memoryStorage({ 'kolhub-demo-v1': JSON.stringify(v1) });
    const s = createDb(mem, seedState).read();
    expect(s.version).toBe(15);
    expect(s).not.toHaveProperty('directory');
    expect(s.sessionAccountId).toBeNull();
    expect(JSON.parse(mem.getItem('kolhub-demo-v1')!).version).toBe(15);
  });

  test('dữ liệu v3 cũ (chưa có KOL Safety) → seed v4 có safetyVideos/safetyMonitors', () => {
    const { safetyVideos: _v, safetyMonitors: _m, ...rest } = seedState();
    const v3 = { ...rest, version: 3, sessionAccountId: 'acc-kol-demo' };
    const mem = memoryStorage({ 'kolhub-demo-v1': JSON.stringify(v3) });
    const s = createDb(mem, seedState).read();
    expect(s.version).toBe(15);
    expect(s.sessionAccountId).toBeNull();
    expect(s.safetyVideos.length).toBeGreaterThan(0);
    expect(s.safetyMonitors.length).toBeGreaterThan(0);
  });

  test('dữ liệu v4 cũ (chưa có vi phạm) → seed v5 có violations', () => {
    const { violations: _x, ...rest } = seedState();
    const v4 = { ...rest, version: 4, sessionAccountId: 'acc-kol-demo' };
    const mem = memoryStorage({ 'kolhub-demo-v1': JSON.stringify(v4) });
    const s = createDb(mem, seedState).read();
    expect(s.version).toBe(15);
    expect(s.sessionAccountId).toBeNull();
    expect(s.violations.length).toBeGreaterThan(0);
  });

  test('dữ liệu v5 cũ (follower kênh theo dõi chưa theo hồ sơ) → seed v6', () => {
    const v5 = { ...seedState(), version: 5, sessionAccountId: 'acc-kol-demo' };
    const mem = memoryStorage({ 'kolhub-demo-v1': JSON.stringify(v5) });
    const s = createDb(mem, seedState).read();
    expect(s.version).toBe(15);
    expect(s.sessionAccountId).toBeNull();
  });

  test('dữ liệu v7 cũ (có liên kết mời KOL) → seed v8 chỉ còn kênh MCN gán cho KOL', () => {
    const v7 = { ...seedState(), version: 7, mcnKolLinks: [{ id: 'x' }], sessionAccountId: 'acc-kol-demo' };
    const mem = memoryStorage({ 'kolhub-demo-v1': JSON.stringify(v7) });
    const s = createDb(mem, seedState).read();
    expect(s.version).toBe(15);
    expect(s.sessionAccountId).toBeNull();
    expect(s).not.toHaveProperty('mcnKolLinks');
    expect(s.channels.some((c) => c.ownerType === 'MCN' && c.assignedKolAccountId)).toBe(true);
  });

  test('dữ liệu v8 cũ (chưa có chiến dịch) → seed v9 có chiến dịch, booking và gói Dùng thử mặc định', () => {
    const rest = seedState() as unknown as Record<string, unknown>;
    delete rest.campaigns;
    delete rest.bookings;
    delete rest.brandPlans;
    const v8 = { ...rest, version: 8, sessionAccountId: 'acc-kol-demo' };
    const mem = memoryStorage({ 'kolhub-demo-v1': JSON.stringify(v8) });
    const s = createDb(mem, seedState).read();
    expect(s.version).toBe(15);
    expect(s.sessionAccountId).toBeNull();
    expect(s.campaigns.length).toBeGreaterThan(0);
    expect(s.bookings.length).toBeGreaterThan(0);
    expect(s.brandPlans).toEqual({});
    expect(JSON.parse(mem.getItem('kolhub-demo-v1')!).version).toBe(15);
  });

  test('dữ liệu v9 cũ (chưa có chiến dịch đã lưu) → seed v10 có savedCampaigns và thêm chiến dịch trên Sàn', () => {
    const rest = seedState() as unknown as Record<string, unknown>;
    delete rest.savedCampaigns;
    const v9 = { ...rest, version: 9, campaigns: (rest.campaigns as unknown[]).slice(0, 6), sessionAccountId: 'acc-mcn-saoviet' };
    const mem = memoryStorage({ 'kolhub-demo-v1': JSON.stringify(v9) });
    const s = createDb(mem, seedState).read();
    expect(s.version).toBe(15);
    expect(s.sessionAccountId).toBeNull();
    expect(s.campaigns).toHaveLength(15);
    expect(s.savedCampaigns.length).toBeGreaterThan(0);
    expect(s.savedCampaigns.every((x) => s.campaigns.some((c) => c.id === x.campaignId))).toBe(true);
    expect(JSON.parse(mem.getItem('kolhub-demo-v1')!).version).toBe(15);
  });

  test('dữ liệu v10 cũ (chiến dịch chưa có ảnh) → seed v11, mọi chiến dịch mẫu có ảnh chiến dịch', () => {
    const fresh = seedState();
    const v10 = {
      ...fresh,
      version: 10,
      campaigns: fresh.campaigns.map(({ cover: _cover, ...c }) => c),
      sessionAccountId: 'acc-biz-demo',
    };
    const mem = memoryStorage({ 'kolhub-demo-v1': JSON.stringify(v10) });
    const s = createDb(mem, seedState).read();
    expect(s.version).toBe(15);
    expect(s.sessionAccountId).toBeNull();
    expect(s.campaigns.every((c) => !!c.cover?.thumbnail)).toBe(true);
    expect(JSON.parse(mem.getItem('kolhub-demo-v1')!).version).toBe(15);
  });

  test('dữ liệu v11 cũ (chưa có Tuyển nhiều KOL) → seed v12 có chiến dịch tuyển nhiều KOL và Hỏi đáp', () => {
    const fresh = seedState();
    const { campaignQuestions: _qa, ...rest } = fresh;
    const v11 = { ...rest, version: 11, campaigns: fresh.campaigns.map(({ type: _t, recruitment: _r, ...c }) => c) };
    const mem = memoryStorage({ 'kolhub-demo-v1': JSON.stringify(v11) });
    const s = createDb(mem, seedState).read();
    expect(s.version).toBe(15);
    expect(s.campaigns.filter((c) => c.type === 'OPEN_RECRUITMENT').length).toBeGreaterThanOrEqual(5);
    expect(s.campaignQuestions.length).toBeGreaterThan(0);
  });

  test('dữ liệu v12 cũ (chưa có lịch sử hợp tác) → seed v13 có bài đã đăng và thanh toán của KOL/MCN mẫu', () => {
    const fresh = seedState();
    const v12 = { ...fresh, version: 12, bookings: fresh.bookings.filter((b) => !b.id.startsWith('bk-seed-ls-')) };
    const mem = memoryStorage({ 'kolhub-demo-v1': JSON.stringify(v12) });
    const s = createDb(mem, seedState).read();
    expect(s.version).toBe(15);
    expect(s.bookings.some((b) => b.id.startsWith('bk-seed-ls-'))).toBe(true);
    expect(JSON.parse(mem.getItem('kolhub-demo-v1')!).version).toBe(15);
  });

  test('update ghi lại storage', () => {
    const mem = memoryStorage({});
    const db = createDb(mem, seedState);
    db.update((s) => {
      s.sessionAccountId = 'x';
    });
    expect(JSON.parse(mem.getItem('kolhub-demo-v1')!).sessionAccountId).toBe('x');
  });

  test('storage null vẫn chạy trong bộ nhớ', () => {
    const db = createDb(null, seedState);
    db.update((s) => {
      s.sessionAccountId = 'y';
    });
    expect(db.read().sessionAccountId).toBe('y');
  });

  test('storage ném lỗi vẫn chạy trong bộ nhớ', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    const db = createDb(broken, seedState);
    db.update((s) => {
      s.sessionAccountId = 'z';
    });
    expect(db.read().sessionAccountId).toBe('z');
  });

  test('read trả bản sao', () => {
    const db = createDb(null, seedState);
    db.read().accounts.pop();
    expect(db.read().accounts).toHaveLength(45);
  });

  test('reset về seed', () => {
    const mem = memoryStorage({});
    const db = createDb(mem, seedState);
    db.update((s) => {
      s.accounts = [];
      s.sessionAccountId = 'x';
    });
    db.reset();
    expect(db.read().accounts).toHaveLength(45);
    expect(db.read().sessionAccountId).toBeNull();
    expect(JSON.parse(mem.getItem('kolhub-demo-v1')!).accounts).toHaveLength(45);
  });

  test('state hợp lệ được giữ nguyên khi tạo lại db', () => {
    const mem = memoryStorage({});
    createDb(mem, seedState).update((s) => {
      s.sessionAccountId = 'keep';
    });
    expect(createDb(mem, seedState).read().sessionAccountId).toBe('keep');
  });
});

describe('seedState', () => {
  test('5 tài khoản demo + 40 KOL mẫu đã duyệt, mật khẩu demo1234, email/SĐT không trùng', () => {
    const s = seedState();
    expect(s.version).toBe(15);
    expect(s.accounts.slice(0, 5).map((a) => [a.type, a.email, a.phone])).toEqual([
      ['KOL', 'kol@demo.kolhub.vn', '0912000001'],
      ['MCN', 'mcn@demo.kolhub.vn', '0912000002'],
      ['BIZ', 'brand@vinamilk-demo.vn', undefined],
      ['MCN', 'saoviet@demo.kolhub.vn', '0912000003'],
      ['BIZ', 'agency@newbrand-demo.vn', undefined],
    ]);
    expect(s.accounts.every((a) => a.password === 'demo1234')).toBe(true);
    expect(s.accounts[2]).toMatchObject({ fullName: 'Nguyễn Minh Anh', company: 'Công ty Demo Sữa' });
    expect(s.accounts[4]).toMatchObject({ fullName: 'Trần Thu Hà', company: 'Công ty TNHH Newbrand Agency' });
    expect(s.accounts.slice(5).every((a) => a.type === 'KOL')).toBe(true);
    expect(new Set(s.accounts.map((a) => a.email)).size).toBe(45);
    expect(new Set(s.accounts.map((a) => a.phone).filter(Boolean)).size).toBe(43);
    expect(s).not.toHaveProperty('directory');
  });

  test('Nhãn hàng mới chưa có danh sách lưu; Nhãn hàng đã xác thực có 2 danh sách mẫu', () => {
    const s = seedState();
    const id = (email: string) => s.accounts.find((a) => a.email === email)!.id;
    expect(s.savedLists.filter((l) => l.accountId === id('agency@newbrand-demo.vn'))).toEqual([]);
    expect(s.savedLists.filter((l) => l.accountId === id('brand@vinamilk-demo.vn'))).toHaveLength(2);
  });

  test('khanhvy@demo.kolhub.vn là tài khoản của KOL mẫu Khánh Vy (KOL-2026-0001), không nhân bản', () => {
    const s = seedState();
    const acc = s.accounts.filter((a) => a.email === 'khanhvy@demo.kolhub.vn');
    expect(acc).toHaveLength(1);
    const profiles = s.kolProfiles.filter((p) => p.contact.displayName === 'Khánh Vy');
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({ accountId: acc[0].id, kolId: 'KOL-2026-0001', status: 'APPROVED' });
  });
});

// --- phase 3 ---
describe('phase 3 keys', () => {
  test('dữ liệu v2 cũ thiếu savedLists → bù từ seed, giữ tài khoản đã có', () => {
    const extraAcc = { ...seedState().accounts[0], id: 'acc-extra', email: 'extra@demo.vn', phone: '0912000009' };
    const old = { ...seedState(), accounts: [...seedState().accounts, extraAcc] } as Record<string, unknown>;
    delete old.savedLists;
    const mem = memoryStorage({ 'kolhub-demo-v1': JSON.stringify(old) });
    const db = createDb(mem, seedState);
    expect(db.read().savedLists).toHaveLength(2);
    expect(db.read().accounts).toHaveLength(46);
    expect(JSON.parse(mem.getItem('kolhub-demo-v1')!).savedLists).toHaveLength(2);
  });

  test('dữ liệu đã có savedLists giữ nguyên, không bị ghi đè', () => {
    const old = { ...seedState(), savedLists: [] };
    const db = createDb(memoryStorage({ 'kolhub-demo-v1': JSON.stringify(old) }), seedState);
    expect(db.read().savedLists).toEqual([]);
  });
});

// --- phase 2 ---
describe('phase 2 state keys', () => {
  test('state v2 thiếu khoá Đợt 2 → bổ sung từ seed, giữ tài khoản', () => {
    const old = seedState();
    old.accounts.push({ ...old.accounts[0], id: 'new1', email: 'x@y.vn' });
    for (const k of ['kolProfiles', 'mcnProfiles', 'identities', 'ekycSessions', 'ekycScenario', 'channels', 'reviewRequests', 'changeRequests', 'funnel'])
      delete (old as unknown as Record<string, unknown>)[k];
    const db = createDb(memoryStorage({ 'kolhub-demo-v1': JSON.stringify(old) }), seedState);
    expect(db.read().accounts.map((a) => a.id)).toContain('new1');
    expect(db.read().channels.length).toBeGreaterThan(40);
    expect(db.read().ekycScenario).toBe('SUCCESS');
  });

  test('seed: KOL và MCN mẫu (hồ sơ mới) có hồ sơ DRAFT rỗng', () => {
    const s = seedState();
    expect(s.kolProfiles).toHaveLength(41);
    expect(s.kolProfiles[0]).toMatchObject({
      status: 'DRAFT',
      ekycStatus: 'NOT_STARTED',
      contact: { displayName: '', email: 'kol@demo.kolhub.vn', phone: '0912000001' },
    });
    expect(s.mcnProfiles[0]).toMatchObject({ status: 'DRAFT', org: { orgName: '', regNo: '' } });
    expect(s.mcnProfiles[0].gcnFile).toBeUndefined();
  });

  test('setItem ném lỗi (hết quota) → vẫn đọc được thay đổi trong bộ nhớ', () => {
    const bad = {
      ...memoryStorage({}),
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const db = createDb(bad, seedState);
    db.update((s) => {
      s.ekycScenario = 'KOLHUB-4101';
    });
    expect(db.read().ekycScenario).toBe('KOLHUB-4101');
  });
});
