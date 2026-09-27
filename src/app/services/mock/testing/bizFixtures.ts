// Shared fixtures for phase-3 service tests (not imported by app code).
import type { DirectoryChannel, DirectoryKol, KolPrivateData } from '../../bizTypes';
import { createDb, type Db, type StoredAccount } from '../db';
import { seedState } from '../seed';

export const NOW = Date.UTC(2026, 8, 27, 3);
export const DAY = 86_400_000;
export const iso = (ms: number) => new Date(ms).toISOString();

export const BIZ2: StoredAccount = {
  id: 'acc-biz-2',
  type: 'BIZ',
  email: 'brand2@acme-demo.vn',
  fullName: 'Lê Văn C',
  company: 'Acme Demo',
  createdAt: '2026-09-01T08:00:00.000Z',
  password: 'demo1234',
};

const SESSION_IDS = { biz: 'acc-biz-demo', biz2: BIZ2.id, kol: 'acc-kol-demo' } as const;
export type FixtureSession = keyof typeof SESSION_IDS | null;

const SECRET: KolPrivateData = {
  phone: '0909000001',
  address: 'Số 1 Đường Bí Mật',
  zalo: '0909000001',
  idNoMasked: '0010******01',
  violations: 2,
  bookingPrice: '99,000,000 VNĐ',
};

let channelSeq = 0;

export function makeChannel(over: Partial<DirectoryChannel> = {}): DirectoryChannel {
  channelSeq += 1;
  const platform = over.platform ?? 'youtube';
  return {
    id: `ch-${channelSeq}`,
    platform,
    url: `${platform}.com/@ch${channelSeq}`,
    handle: `@ch${channelSeq}`,
    followers: 1_000,
    status: 'VERIFIED',
    active: true,
    badgeExpiresAt: iso(NOW + 100 * DAY),
    verifiedAt: iso(NOW - 5 * DAY),
    ...over,
  };
}

export function makeKol(id: string, over: Partial<DirectoryKol> = {}): DirectoryKol {
  return {
    kolId: id,
    displayName: id,
    nickname: id.toLowerCase(),
    bio: 'Giới thiệu',
    category: 'Gaming',
    region: 'Hà Nội',
    collabEmail: `hoptac.${id.toLowerCase()}@kolhub-demo.vn`,
    verifiedAt: iso(NOW - 5 * DAY),
    channels: [makeChannel()],
    ...over,
  };
}

/** Directory used by search / saved-list tests (see plan Task 2 table). */
export function fixtureDirectory(): DirectoryKol[] {
  const d = (days: number) => iso(NOW - days * DAY);
  const list: DirectoryKol[] = [
    makeKol('KOL-T-0001', {
      displayName: 'Châu Bùi',
      nickname: 'chaubui',
      category: 'Thời trang',
      region: 'TP. Hồ Chí Minh',
      verifiedAt: d(5),
      channels: [
        makeChannel({ platform: 'tiktok', url: 'tiktok.com/@chaubui', handle: '@chaubui', followers: 3_200_000 }),
        makeChannel({ platform: 'facebook', url: 'facebook.com/chaubui', handle: '@chaubui', followers: 1_000_000 }),
      ],
      private: { ...SECRET },
    }),
    makeKol('KOL-T-0002', {
      displayName: 'Chan La Cà',
      nickname: 'chanlaca',
      category: 'Du lịch',
      region: 'TP. Hồ Chí Minh',
      verifiedAt: d(1),
      channels: [makeChannel({ platform: 'youtube', url: 'youtube.com/@chanlaca', followers: 2_800_000 })],
    }),
    makeKol('KOL-T-0003', {
      displayName: 'Bếp Nhà Chau',
      nickname: 'bepnhachau',
      category: 'Ẩm thực',
      region: 'Hà Nội',
      verifiedAt: d(10),
      channels: [makeChannel({ platform: 'facebook', url: 'facebook.com/bepnhachau', followers: 50_000 })],
      private: { ...SECRET },
    }),
    makeKol('KOL-T-0004', {
      displayName: 'Hết Hạn Test',
      nickname: 'hethan',
      verifiedAt: d(365),
      channels: [makeChannel({ platform: 'tiktok', url: 'tiktok.com/@hethan', badgeExpiresAt: iso(NOW) })],
    }),
    makeKol('KOL-T-0005', {
      displayName: 'Tắt Hoạt Động',
      nickname: 'tathd',
      verifiedAt: d(3),
      channels: [makeChannel({ platform: 'youtube', url: 'youtube.com/@tathd', active: false })],
    }),
    makeKol('KOL-T-0006', {
      displayName: 'Kênh Trộn',
      nickname: 'kenhtron',
      region: 'Hải Phòng',
      verifiedAt: d(4),
      channels: [
        makeChannel({ platform: 'tiktok', url: 'tiktok.com/@kenhtron', active: false }),
        makeChannel({ platform: 'facebook', url: 'facebook.com/kenhtron', followers: 20_000 }),
      ],
    }),
    makeKol('KOL-T-0007', {
      displayName: 'Chờ Duyệt',
      nickname: 'choduyet',
      verifiedAt: d(2),
      channels: [makeChannel({ platform: 'youtube', status: 'PENDING_REVIEW', badgeExpiresAt: null, verifiedAt: null })],
    }),
  ];
  for (let n = 1; n <= 25; n++) {
    const nn = String(n).padStart(2, '0');
    list.push(
      makeKol(`KOL-T-01${nn}`, {
        displayName: `Filler ${nn}`,
        nickname: `filler${nn}`,
        category: 'Gaming',
        region: 'Đà Nẵng',
        verifiedAt: d(20 + n),
        channels: [makeChannel({ platform: 'youtube', url: `youtube.com/@filler${nn}`, followers: 10_000 + n })],
      }),
    );
  }
  return list;
}

export function bizState(opts: { directory?: DirectoryKol[]; session?: FixtureSession } = {}): Db {
  const session: FixtureSession = 'session' in opts ? (opts.session ?? null) : 'biz';
  return createDb(null, () => {
    const s = seedState();
    return {
      ...s,
      accounts: [...s.accounts, { ...BIZ2 }],
      directory: opts.directory ?? fixtureDirectory(),
      savedLists: [],
      sessionAccountId: session ? SESSION_IDS[session] : null,
    };
  });
}

export function switchSession(db: Db, who: FixtureSession): void {
  db.update((s) => {
    s.sessionAccountId = who ? SESSION_IDS[who] : null;
  });
}
