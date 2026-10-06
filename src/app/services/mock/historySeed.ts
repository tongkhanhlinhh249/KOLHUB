// Seed v13: past collaborations of the two verified suppliers (Khánh Vy, Sao Việt Media) so "Bài đã đăng" and
// "Thu nhập" have several months of verified posts, ratings and payments, all with the fictional demo brand.
import type { Platform } from '../bizTypes';
import type { Booking, BookingEvent, Campaign, ContentSubmission } from '../campaign-types';
import type { Channel, StoredFile } from '../profile-types';
import { isoDay, postMetrics } from './campaignRules';
import { VERIFIED_MCN_ACCOUNT_ID, VERIFIED_MCN_ID } from './mcnSeed';

const DAY = 86_400_000;

/** Fixed ids so the UI and tests can refer to them. */
export const SEED_HISTORY = {
  /** Demo brand, ended ~7 weeks ago. */
  summerCampaign: 'cmp-seed-he-sua-hat',
  /** Demo brand, ended ~3 months ago. */
  runningShoesCampaign: 'cmp-seed-giay-chay',
  /** Demo brand, private, still running: Khánh Vy's post is verified and the brand marked it paid. */
  homeOfficeCampaign: 'cmp-seed-goc-lam-viec',
  vySummer: 'bk-seed-ls-vy-he',
  vyShoes: 'bk-seed-ls-vy-giay',
  vyHomeOffice: 'bk-seed-ls-vy-goc',
  saoVietSummer: 'bk-seed-ls-sv-he',
  saoVietShoes: 'bk-seed-ls-sv-giay',
} as const;

export function seedHistory(
  channels: Channel[],
  now: number,
  ids: { brand: string; khanhVy: string },
  coverOf: (photoId: string, slug: string) => StoredFile,
): { campaigns: Campaign[]; bookings: Booking[] } {
  const ago = (d: number) => now - d * DAY;
  const day = (n: number) => isoDay(now + n * DAY);
  const followers = (id: string) => channels.find((c) => c.id === id)?.stats?.followers ?? 0;
  const vyCh = (p: Platform) => `KOL-2026-0001-${p}`;
  const mcnCh = (n: number) => `${VERIFIED_MCN_ID}-ch-${String(n).padStart(2, '0')}`;
  const kolAcc = (n: number) => `acc-kol-2026-${String(n).padStart(4, '0')}`;
  const kolId = (n: number) => `KOL-2026-${String(n).padStart(4, '0')}`;
  const ev = (at: number, by: BookingEvent['by'], action: BookingEvent['action'], more: Partial<BookingEvent> = {}): BookingEvent => ({ at, by, action, ...more });

  const base = {
    objective: '',
    brief: '',
    contentRules: 'Gắn nhãn #QuangCao.',
    categories: [] as Campaign['categories'],
  };
  const summer: Campaign = {
    ...base,
    id: SEED_HISTORY.summerCampaign,
    brandAccountId: ids.brand,
    cover: coverOf('1549733539', 'summer'),
    name: 'Mùa hè mát lành cùng sữa hạt',
    objective: 'Giới thiệu sữa hạt ướp lạnh cho những ngày hè.',
    brief: 'Video ngắn về đồ uống mát từ sữa hạt cho cả nhà trong mùa hè.',
    budget: 160_000_000,
    startDate: day(-95),
    endDate: day(-48),
    platforms: ['tiktok', 'youtube'],
    categories: ['Ẩm thực', 'Gia đình'],
    deliverables: [
      { type: 'VIDEO', platform: 'tiktok', quantity: 2 },
      { type: 'VIDEO', platform: 'youtube', quantity: 2 },
    ],
    visibility: 'PRIVATE',
    status: 'COMPLETED',
    publishedAt: ago(95),
    closedAt: ago(46),
    createdAt: ago(98),
    updatedAt: ago(46),
  };
  const shoes: Campaign = {
    ...base,
    id: SEED_HISTORY.runningShoesCampaign,
    brandAccountId: ids.brand,
    cover: coverOf('1558722199', 'shoes'),
    name: 'Chạy bộ cuối tuần cùng giày mới',
    objective: 'Lan toả thói quen chạy bộ cuối tuần cho người đi làm.',
    brief: 'Ghi lại buổi chạy cuối tuần với mẫu giày chạy bộ mới của nhãn hàng.',
    budget: 90_000_000,
    startDate: day(-125),
    endDate: day(-80),
    platforms: ['tiktok', 'facebook'],
    categories: ['Lifestyle'],
    deliverables: [
      { type: 'VIDEO', platform: 'tiktok', quantity: 1 },
      { type: 'POST', platform: 'facebook', quantity: 1 },
    ],
    visibility: 'PRIVATE',
    status: 'COMPLETED',
    publishedAt: ago(125),
    closedAt: ago(78),
    createdAt: ago(128),
    updatedAt: ago(78),
  };
  const homeOffice: Campaign = {
    ...base,
    id: SEED_HISTORY.homeOfficeCampaign,
    brandAccountId: ids.brand,
    cover: coverOf('1772587003187', 'homeOffice'),
    name: 'Góc làm việc tại nhà gọn gàng',
    objective: 'Giới thiệu bộ phụ kiện bàn làm việc cho người làm việc tại nhà.',
    brief: 'Một video sắp xếp lại góc làm việc với bộ phụ kiện mới.',
    budget: 60_000_000,
    startDate: day(-30),
    endDate: day(20),
    platforms: ['youtube'],
    categories: ['Công nghệ', 'Lifestyle'],
    deliverables: [{ type: 'VIDEO', platform: 'youtube', quantity: 1 }],
    visibility: 'PRIVATE',
    status: 'RUNNING',
    publishedAt: ago(30),
    createdAt: ago(32),
    updatedAt: ago(4),
  };

  const post = (id: string, itemId: string, url: string, channelId: string, at: number, title: string, hidden = false): ContentSubmission => ({
    id,
    kind: 'POST',
    itemId,
    title,
    url,
    status: 'APPROVED',
    metrics: postMetrics(url, followers(channelId)),
    verifiedAt: at,
    submittedAt: at,
    ...(hidden ? { hiddenOnProfile: true } : {}),
  });

  /** A finished booking: accepted at `start`, post verified at `start - 6`, paid 4–5 days later. */
  function done(
    id: string,
    campaign: Campaign,
    supplier: { type: Booking['supplierType']; accountId: string },
    items: { n: number; kolAccountId: string; kolId: string; channelId: string; platform: Platform; url: string; title: string; hidden?: boolean }[],
    price: number,
    start: number,
    stars: number,
    comment: string,
  ): Booking {
    const verifiedAt = ago(start - 6);
    const marked = ago(start - 10);
    const confirmed = ago(start - 11);
    return {
      id,
      campaignId: campaign.id,
      brandAccountId: campaign.brandAccountId,
      supplierType: supplier.type,
      supplierAccountId: supplier.accountId,
      origin: 'INVITE',
      items: items.map((it, i) => ({
        id: `${id}-i${i + 1}`,
        kolAccountId: it.kolAccountId,
        kolId: it.kolId,
        channelId: it.channelId,
        platform: it.platform,
        deliverableType: 'VIDEO',
        quantity: 1,
      })),
      price,
      note: '',
      status: 'COMPLETED',
      history: [
        ev(ago(start + 2), 'BRAND', 'INVITED', { price }),
        ev(ago(start), 'SUPPLIER', 'ACCEPTED', { price }),
        ...items.flatMap((it) => [ev(verifiedAt, 'SUPPLIER', 'POST_SUBMITTED', { note: it.url }), ev(verifiedAt, 'SYSTEM', 'POST_VERIFIED', { note: it.url })]),
        ev(marked, 'BRAND', 'PAYMENT_MARKED', { price }),
        ev(confirmed, 'SUPPLIER', 'PAYMENT_CONFIRMED', { price }),
        ev(confirmed, 'BRAND', 'RATED'),
      ],
      contents: items.map((it, i) => post(`ct-${id}-${i + 1}`, `${id}-i${i + 1}`, it.url, it.channelId, verifiedAt, it.title, it.hidden)),
      payment: { brandMarkedAt: marked, supplierConfirmedAt: confirmed },
      ratings: { brand: { stars, comment, at: confirmed } },
      acceptedAt: ago(start),
      completedAt: confirmed,
      createdAt: ago(start + 2),
      updatedAt: confirmed,
    };
  }

  const vy = { type: 'KOL' as const, accountId: ids.khanhVy };
  const sv = { type: 'MCN' as const, accountId: VERIFIED_MCN_ACCOUNT_ID };
  const vyItem = (p: Platform, url: string, title: string) => ({ n: 1, kolAccountId: ids.khanhVy, kolId: kolId(1), channelId: vyCh(p), platform: p, url, title });
  const svItem = (n: number, ch: number, p: Platform, url: string, title: string, hidden = false) => ({
    n,
    kolAccountId: kolAcc(n),
    kolId: kolId(n),
    channelId: mcnCh(ch),
    platform: p,
    url,
    title,
    hidden,
  });

  const bookings: Booking[] = [
    done(
      SEED_HISTORY.vySummer,
      summer,
      vy,
      [vyItem('tiktok', 'https://www.tiktok.com/@khanhvy/video/7401100000000000011', 'Ba món đồ uống mát từ sữa hạt')],
      35_000_000,
      70,
      5,
      'Video tự nhiên, gửi link đúng hạn.',
    ),
    done(
      SEED_HISTORY.vyShoes,
      shoes,
      vy,
      [vyItem('facebook', 'https://www.facebook.com/khanhvy.official/posts/7390000000000000021', 'Buổi chạy 5 km sáng Chủ nhật')],
      28_000_000,
      100,
      4,
      'Bài đăng đẹp, cần gắn nhãn sớm hơn.',
    ),
    done(
      SEED_HISTORY.saoVietSummer,
      summer,
      sv,
      [
        svItem(12, 2, 'youtube', 'https://www.youtube.com/watch?v=seedHeSuaHat1', 'Vlog một ngày hè cùng sữa hạt'),
        svItem(14, 5, 'youtube', 'https://www.youtube.com/watch?v=seedHeSuaHat2', 'Đánh giá ba vị sữa hạt ướp lạnh'),
      ],
      70_000_000,
      72,
      5,
      'Hai kênh phối hợp tốt, số liệu vượt kỳ vọng.',
    ),
    done(
      SEED_HISTORY.saoVietShoes,
      shoes,
      sv,
      [svItem(13, 4, 'tiktok', 'https://www.tiktok.com/@baochau.phoido/video/7385000000000000031', 'Phối đồ chạy bộ năng động', true)],
      22_000_000,
      104,
      4,
      'Nội dung ổn, phản hồi hơi chậm.',
    ),
  ];

  // Khánh Vy: post verified, the brand marked it paid; she still has to confirm the money arrived.
  const homeUrl = 'https://www.youtube.com/watch?v=seedGocLamViec1';
  const home: Booking = {
    id: SEED_HISTORY.vyHomeOffice,
    campaignId: homeOffice.id,
    brandAccountId: ids.brand,
    supplierType: 'KOL',
    supplierAccountId: ids.khanhVy,
    origin: 'INVITE',
    items: [{ id: `${SEED_HISTORY.vyHomeOffice}-i1`, kolAccountId: ids.khanhVy, kolId: kolId(1), channelId: vyCh('youtube'), platform: 'youtube', deliverableType: 'VIDEO', quantity: 1 }],
    price: 18_000_000,
    note: '',
    status: 'VERIFIED',
    history: [
      ev(ago(30), 'BRAND', 'INVITED', { price: 18_000_000 }),
      ev(ago(29), 'SUPPLIER', 'ACCEPTED', { price: 18_000_000 }),
      ev(ago(8), 'SUPPLIER', 'POST_SUBMITTED', { note: homeUrl }),
      ev(ago(8), 'SYSTEM', 'POST_VERIFIED', { note: homeUrl }),
      ev(ago(4), 'BRAND', 'PAYMENT_MARKED', { price: 18_000_000 }),
    ],
    contents: [post(`ct-${SEED_HISTORY.vyHomeOffice}-1`, `${SEED_HISTORY.vyHomeOffice}-i1`, homeUrl, vyCh('youtube'), ago(8), 'Sắp xếp lại góc làm việc trong 10 phút')],
    payment: { brandMarkedAt: ago(4) },
    acceptedAt: ago(29),
    createdAt: ago(30),
    updatedAt: ago(4),
  };
  bookings.push(home);

  return { campaigns: [summer, shoes, homeOffice], bookings };
}
