// Shared fixtures for phase-3 service tests (not imported by app code).
import type { ActivityField, ChannelStatus, KolCategory, KolRegion, LatestVideo, Platform } from '../../bizTypes';
import type { Channel, KolProfile } from '../../profile-types';
import { createDb, type Db, type DemoState, type StoredAccount } from '../db';
import { seedState } from '../seed';

/** Compact description of a registered, approved KOL; `installKols` turns it into account + profile + channels. */
export interface FixtureChannel {
  id: string;
  platform: Platform;
  url: string;
  handle: string;
  followers: number;
  status: ChannelStatus;
  active: boolean;
  /** ISO date */
  badgeExpiresAt: string | null;
  /** ISO date */
  verifiedAt: string | null;
}

/** Private data that must never reach a Brand (BR-58); stored on the profile / identity. */
export interface FixturePrivate {
  phone: string;
  address: string;
  zalo: string;
  idNoMasked: string;
}

export interface FixtureKol {
  kolId: string;
  displayName: string;
  nickname: string;
  avatar?: string;
  bio: string;
  category?: KolCategory;
  fields: ActivityField[];
  /** Each video is attached to the KOL's first channel on the same platform (else dropped). */
  latestVideos: LatestVideo[];
  region?: KolRegion;
  collabEmail: string | null;
  /** ISO date */
  verifiedAt: string;
  channels: FixtureChannel[];
  private?: FixturePrivate;
}

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

const SECRET: FixturePrivate = {
  phone: '0909000001',
  address: 'Số 1 Đường Bí Mật',
  zalo: '0909000001',
  idNoMasked: '0010******01',
};

let channelSeq = 0;

export function makeChannel(over: Partial<FixtureChannel> = {}): FixtureChannel {
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

export function makeVideo(platform: Platform | 'instagram', n: number): LatestVideo {
  return {
    platform: platform as Platform,
    thumbnail: `https://img.example/${platform}-${n}.jpg`,
    url: `https://${platform}.com/v/${n}`,
    title: `Video ${n}`,
    publishedAt: iso(NOW - n * DAY),
  };
}

export function makeKol(id: string, over: Partial<FixtureKol> = {}): FixtureKol {
  const category = 'category' in over ? over.category : 'Gaming';
  return {
    fields: category ? [{ name: category, medal: 'none' }] : [],
    latestVideos: [],
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
export function fixtureDirectory(): FixtureKol[] {
  const d = (days: number) => iso(NOW - days * DAY);
  const list: FixtureKol[] = [
    makeKol('KOL-T-0001', {
      displayName: 'Châu Bùi',
      nickname: 'chaubui',
      category: 'Thời trang',
      region: 'TP. Hồ Chí Minh',
      verifiedAt: d(5),
      fields: [
        { name: 'Thời trang', medal: 'gold' },
        { name: 'Làm đẹp', medal: 'silver' },
        { name: 'Lifestyle', medal: 'none' },
      ],
      // Instagram and YouTube (no channel) videos must never surface (BR-20).
      latestVideos: [makeVideo('instagram', 1), makeVideo('tiktok', 2), makeVideo('youtube', 3), makeVideo('facebook', 4), makeVideo('tiktok', 5)],
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
      latestVideos: [makeVideo('tiktok', 1), makeVideo('facebook', 2)],
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

const ms = (isoDate: string | null) => (isoDate ? Date.parse(isoDate) : undefined);

/** Register fixture KOLs as approved KOL accounts (account + profile + identity + channels with stats). */
export function installKols(s: DemoState, kols: FixtureKol[]): void {
  kols.forEach((k, n) => {
    const accountId = `acc-fx-${k.kolId}`;
    const at = Date.parse(k.verifiedAt);
    const phone = k.private?.phone ?? '0977' + String(n).padStart(6, '0');
    s.accounts.push({ id: accountId, type: 'KOL', email: `${k.nickname || n}@fixture.kolhub.vn`, phone, createdAt: k.verifiedAt, password: 'demo1234' });
    const profile: KolProfile = {
      accountId,
      ownerType: 'KOL',
      kolId: k.kolId,
      ekycStatus: 'PASSED',
      status: 'APPROVED',
      contact: {
        displayName: k.displayName,
        phone,
        email: k.collabEmail ?? '',
        zalo: k.private?.zalo ?? '',
        country: 'Việt Nam',
        province: k.region ?? '',
        address: k.private?.address ?? '',
        category: k.category ?? '',
        bio: k.bio,
        fields: k.fields.map((f) => ({ ...f })),
      },
      staff: { staffName: 'Quản lý', staffPhone: '0987654321', staffEmail: '' },
      ...(k.avatar ? { avatar: { name: 'a.jpg', type: 'image/jpeg', size: 0, thumbnail: k.avatar } } : {}),
      approvedAt: at,
      decidedAt: at,
      createdAt: at,
      updatedAt: at,
    };
    s.kolProfiles.push(profile);
    if (k.private) {
      s.identities.push({
        accountId,
        fullName: k.displayName.toUpperCase(),
        dob: '01/01/1995',
        idNoMasked: k.private.idNoMasked,
        issueDate: '10/08/2021',
        ekycSessionId: `fx-${k.kolId}`,
        verifiedAt: at,
      });
    }
    const channels: Channel[] = k.channels.map((c) => ({
      id: c.id,
      ownerType: 'KOL',
      ownerId: accountId,
      platform: c.platform,
      url: c.url,
      handle: c.handle,
      proofImage: { name: 'p.png', type: 'image/png', size: 100 },
      status: c.status,
      active: c.active,
      badgeExpiresAt: ms(c.badgeExpiresAt),
      verifiedAt: ms(c.verifiedAt),
      stats: { followers: c.followers, latestVideos: [], syncedAt: at },
      createdAt: at,
      updatedAt: at,
    }));
    for (const v of k.latestVideos) channels.find((c) => c.platform === v.platform)?.stats!.latestVideos.push({ ...v });
    s.channels.push(...channels);
  });
}

/** Drop the 40 seeded sample KOLs (profiles with a KOL ID) so tests only see their fixtures. */
export function removeSeededKols(s: DemoState): void {
  const ids = new Set(s.kolProfiles.filter((p) => p.kolId).map((p) => p.accountId));
  s.accounts = s.accounts.filter((a) => !ids.has(a.id));
  s.kolProfiles = s.kolProfiles.filter((p) => !ids.has(p.accountId));
  s.identities = s.identities.filter((x) => !ids.has(x.accountId));
  s.channels = s.channels.filter((c) => !ids.has(c.ownerId));
}

/** Live channels (inside a db.update) of the fixture KOL with this KOL ID. */
export function kolChannels(s: DemoState, kolId: string): Channel[] {
  const p = s.kolProfiles.find((x) => x.kolId === kolId);
  return p ? s.channels.filter((c) => c.ownerId === p.accountId) : [];
}

export function bizState(opts: { kols?: FixtureKol[]; session?: FixtureSession } = {}): Db {
  const session: FixtureSession = 'session' in opts ? (opts.session ?? null) : 'biz';
  return createDb(null, () => {
    const s = seedState();
    removeSeededKols(s);
    installKols(s, opts.kols ?? fixtureDirectory());
    s.accounts.push({ ...BIZ2 });
    s.savedLists = [];
    s.sessionAccountId = session ? SESSION_IDS[session] : null;
    return s;
  });
}

export function switchSession(db: Db, who: FixtureSession): void {
  db.update((s) => {
    s.sessionAccountId = who ? SESSION_IDS[who] : null;
  });
}
