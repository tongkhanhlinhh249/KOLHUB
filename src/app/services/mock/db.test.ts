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
    expect(db.read().accounts).toHaveLength(3);
  });

  test('reset về seed khi sai version', () => {
    const mem = memoryStorage({ 'kolhub-demo-v1': JSON.stringify({ version: 0 }) });
    expect(createDb(mem, seedState).read().version).toBe(1);
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
    expect(db.read().accounts).toHaveLength(3);
  });

  test('reset về seed', () => {
    const mem = memoryStorage({});
    const db = createDb(mem, seedState);
    db.update((s) => {
      s.accounts = [];
      s.sessionAccountId = 'x';
    });
    db.reset();
    expect(db.read().accounts).toHaveLength(3);
    expect(db.read().sessionAccountId).toBeNull();
    expect(JSON.parse(mem.getItem('kolhub-demo-v1')!).accounts).toHaveLength(3);
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
  test('3 tài khoản mẫu, mật khẩu demo1234', () => {
    const s = seedState();
    expect(s.accounts.map((a) => [a.type, a.email, a.phone])).toEqual([
      ['KOL', 'kol@demo.kolhub.vn', '0912000001'],
      ['MCN', 'mcn@demo.kolhub.vn', '0912000002'],
      ['BIZ', 'brand@vinamilk-demo.vn', undefined],
    ]);
    expect(s.accounts.every((a) => a.password === 'demo1234')).toBe(true);
    expect(s.accounts[2]).toMatchObject({ fullName: 'Nguyễn Minh Anh', company: 'Công ty Demo Sữa' });
  });
});

// --- phase 3 ---
describe('phase 3 keys', () => {
  test('dữ liệu cũ thiếu directory/savedLists → bù từ seed, giữ tài khoản đã có', () => {
    const extraAcc = { ...seedState().accounts[0], id: 'acc-extra', email: 'extra@demo.vn', phone: '0912000009' };
    const old = { ...seedState(), accounts: [...seedState().accounts, extraAcc] } as Record<string, unknown>;
    delete old.directory;
    delete old.savedLists;
    const mem = memoryStorage({ 'kolhub-demo-v1': JSON.stringify(old) });
    const db = createDb(mem, seedState);
    expect(db.read().directory).toHaveLength(40);
    expect(db.read().savedLists).toHaveLength(2);
    expect(db.read().accounts).toHaveLength(4);
    expect(JSON.parse(mem.getItem('kolhub-demo-v1')!).directory).toHaveLength(40);
  });

  test('dữ liệu đã có savedLists giữ nguyên, không bị ghi đè', () => {
    const old = { ...seedState(), savedLists: [] };
    const db = createDb(memoryStorage({ 'kolhub-demo-v1': JSON.stringify(old) }), seedState);
    expect(db.read().savedLists).toEqual([]);
  });

  test('directory cũ thiếu fields/latestVideos → bù theo kolId từ seed, giữ phần còn lại', () => {
    const old = seedState() as unknown as { directory: Record<string, unknown>[] };
    for (const k of old.directory) {
      delete k.fields;
      delete k.latestVideos;
    }
    old.directory[0].displayName = 'Tên đã sửa';
    const db = createDb(memoryStorage({ 'kolhub-demo-v1': JSON.stringify(old) }), seedState);
    const k = db.read().directory[0];
    expect(k.displayName).toBe('Tên đã sửa');
    expect(k.fields.length).toBeGreaterThan(0);
    expect(k.latestVideos.length).toBeGreaterThan(0);
  });
});

// --- phase 2 ---
describe('phase 2 state keys', () => {
  test('state v1 cũ thiếu khoá Đợt 2 → bổ sung từ seed, giữ tài khoản', () => {
    const old = seedState();
    old.accounts.push({ ...old.accounts[0], id: 'new1', email: 'x@y.vn' });
    for (const k of ['kolProfiles', 'mcnProfiles', 'identities', 'ekycSessions', 'ekycScenario', 'channels', 'reviewRequests', 'changeRequests', 'funnel'])
      delete (old as unknown as Record<string, unknown>)[k];
    const db = createDb(memoryStorage({ 'kolhub-demo-v1': JSON.stringify(old) }), seedState);
    expect(db.read().accounts.map((a) => a.id)).toContain('new1');
    expect(db.read().channels).toEqual([]);
    expect(db.read().ekycScenario).toBe('SUCCESS');
  });

  test('seed: KOL và MCN mẫu có hồ sơ DRAFT rỗng', () => {
    const s = seedState();
    expect(s.kolProfiles).toHaveLength(1);
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
