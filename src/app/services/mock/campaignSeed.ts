// Seed v9: campaign booking beta — campaigns of the two demo brands, bookings with Sao Việt Media and Khánh Vy.
// Seed v10 (Sàn v2): 4 more marketplace campaigns with varied fit, and saved campaigns of the two suppliers.
// Seed v11: every campaign has a cover image ("Ảnh chiến dịch").
// Seed v12: "Tuyển nhiều KOL" — livestream / tai nghe / thử thách tiếng Anh become open recruitment, plus one campaign
// in "Chọn lọc" and one in "Đăng bài" (see recruitSeed.ts), and public Q&A.
// Seed v13: past collaborations of Khánh Vy and Sao Việt Media (see historySeed.ts).
import type { Platform } from '../bizTypes';
import type { Booking, BookingEvent, Campaign, CampaignQA, ContentSubmission, DeliverableGroup, SavedCampaign } from '../campaign-types';
import type { Channel, StoredFile } from '../profile-types';
import { isoDay, postMetrics } from './campaignRules';
import { VERIFIED_MCN_ACCOUNT_ID, VERIFIED_MCN_ID } from './mcnSeed';
import { scanVideoFile } from './safety';
import { IMAGE_POOL } from './socialListening';
import { SEED_RECRUIT, seedRecruitment } from './recruitSeed';
import { SEED_HISTORY, seedHistory } from './historySeed';
import { deriveCampaignFields, groupPlatforms } from './recruitment';

export { SEED_RECRUIT, SEED_RECRUIT_BOOKING } from './recruitSeed';
export { SEED_HISTORY } from './historySeed';

const DAY = 86_400_000;
const HOUR = 3_600_000;

export const SEED_BRAND_ID = 'acc-biz-demo';
export const SEED_AGENCY_ID = 'acc-biz-new';
export const SEED_KHANHVY_ID = 'acc-kol-2026-0001';
const SAOVIET = VERIFIED_MCN_ACCOUNT_ID;
const kolAcc = (n: number) => `acc-kol-2026-${String(n).padStart(4, '0')}`;
const kolId = (n: number) => `KOL-2026-${String(n).padStart(4, '0')}`;
const mcnCh = (n: number) => `${VERIFIED_MCN_ID}-ch-${String(n).padStart(2, '0')}`;

/** Fixed ids so the UI and tests can refer to them. */
export const SEED_CAMPAIGN = {
  /** Booking 1 KOL, private: Sao Việt chosen (draft under review), recruitment closed. */
  running: 'cmp-seed-sua-hat',
  /** Booking 1 KOL on the Sàn: several applications, the brand picks one. */
  marketplace: 'cmp-seed-am-thuc-thu',
  // v19 (Booking 1 KOL: one KOL per campaign)
  /** Private, OPEN: invites waiting (Khánh Vy). */
  breakfast: 'cmp-seed-bua-sang',
  /** Private, closed: Sao Việt's post verified, waiting for payment. */
  officeMilk: 'cmp-seed-van-phong',
  /** Private, closed: collaboration completed (brand can mark "Hoàn tất"). */
  smoothie: 'cmp-seed-sinh-to',
  draft: 'cmp-seed-tri-an',
  /** v17: demo brand, waiting for Admin review. */
  pendingReview: 'cmp-seed-cho-duyet',
  agencyFashion: 'cmp-seed-thoi-trang',
  agencyEnglish: 'cmp-seed-tieng-anh',
  agencyTravel: 'cmp-seed-du-lich',
  // v10
  /** Demo brand, TikTok only, apply deadline tomorrow. */
  yogurt: 'cmp-seed-sua-chua',
  /** Demo brand, Facebook livestream. */
  livestream: 'cmp-seed-livestream-bep',
  /** Agency, YouTube only (tech). */
  agencyHeadphones: 'cmp-seed-tai-nghe',
  /** Agency, TikTok + Facebook livestream, education. */
  agencyChallenge: 'cmp-seed-thu-thach-tieng-anh',
  // v12 ("Tuyển nhiều KOL"; livestream, agencyHeadphones and agencyChallenge are open recruitment too)
  /** Demo brand, open recruitment in "Chọn lọc" with applicants to pick. */
  recruitSelecting: SEED_RECRUIT.selecting,
  /** Agency, open recruitment in "Đăng bài", Workflow off. */
  recruitPosting: SEED_RECRUIT.posting,
} as const;

export const SEED_BOOKING = {
  review: 'bk-seed-review',
  verified: 'bk-seed-verified',
  completed: 'bk-seed-completed',
  khanhVyInvite: 'bk-seed-khanhvy',
  application: 'bk-seed-application',
} as const;

/**
 * "Ảnh chiến dịch" of a seeded campaign: a generic stock photo from the sample image pool (matched by its photo id),
 * requested at 800 px wide for the 16:9 card. Falls back to the first pool image.
 */
function coverOf(photoId: string, slug: string): StoredFile {
  const url = IMAGE_POOL.find((u) => u.includes(photoId)) ?? IMAGE_POOL[0];
  return { name: `anh-chien-dich-${slug}.jpg`, type: 'image/jpeg', size: 420_000, thumbnail: url.replace(/([?&])w=\d+/, '$1w=800') };
}

function campaign(base: Omit<Campaign, 'createdAt' | 'updatedAt'> & { createdAt: number; updatedAt?: number }): Campaign {
  return { ...base, updatedAt: base.updatedAt ?? base.createdAt };
}

/**
 * EP-02 v1.1: a Booking riêng campaign has a fixed reward per deliverable group (platform), no price negotiation.
 * `groups` given → used as is; otherwise the budget shared evenly across the platform groups. The budget is then derived
 * (Σ slots × reward), like the service does.
 */
function withGroups(c: Campaign, groups?: DeliverableGroup[]): Campaign {
  if (c.type === 'OPEN_RECRUITMENT' || c.deliverables.length === 0) return c;
  const platforms = groupPlatforms(c);
  const out: Campaign = {
    ...c,
    // Booking 1 KOL: the chosen KOL gets the whole budget, shared evenly across the platform groups.
    groups: groups ?? platforms.map((platform) => ({ platform, slots: 1, reward: { cash: Math.round(c.budget / platforms.length) } })),
  };
  deriveCampaignFields(out);
  return out;
}

export function seedCampaigns(
  channels: Channel[],
  now: number,
): { campaigns: Campaign[]; bookings: Booking[]; savedCampaigns: SavedCampaign[]; campaignQuestions: CampaignQA[] } {
  const day = (n: number) => isoDay(now + n * DAY);
  const ago = (days: number, hours = 0) => now - days * DAY - hours * HOUR;
  const followers = (id: string) => channels.find((c) => c.id === id)?.stats?.followers ?? 0;

  // --- demo brand ---
  const running = campaign({
    id: SEED_CAMPAIGN.running,
    cover: coverOf('1549733539', 'running'),
    brandAccountId: SEED_BRAND_ID,
    name: 'Ra mắt sữa hạt vị mới',
    objective: 'Tăng nhận biết dòng sữa hạt vị mới với nhóm khách hàng gia đình trẻ.',
    brief:
      'Giới thiệu sữa hạt vị mới qua khoảnh khắc bữa sáng gia đình. Nhấn mạnh vị thanh, ít ngọt, phù hợp cả trẻ nhỏ. Mỗi video lồng ghép một công thức đơn giản dùng sữa hạt.',
    budget: 300_000_000,
    startDate: day(-25),
    endDate: day(35),
    platforms: ['tiktok', 'youtube', 'facebook'],
    categories: ['Ẩm thực', 'Gia đình'],
    deliverables: [
      { type: 'VIDEO', platform: 'tiktok', quantity: 3 },
      { type: 'VIDEO', platform: 'youtube', quantity: 1 },
      { type: 'POST', platform: 'facebook', quantity: 2 },
    ],
    contentRules:
      'Gắn nhãn #QuangCao ở đầu video. Không so sánh với sản phẩm của thương hiệu khác. Không khẳng định công dụng chữa bệnh. Hiển thị sản phẩm rõ trong 5 giây đầu.',
    visibility: 'PRIVATE',
    // Booking 1 KOL: Sao Việt was chosen, so recruitment closed and the campaign is in production.
    status: 'CLOSED',
    recruitmentClosedAt: ago(19),
    log: [{ at: ago(19), by: 'SYSTEM', action: 'CLOSED', note: 'Đã chọn KOL cho chiến dịch.' }],
    publishedAt: ago(22),
    createdAt: ago(28),
    updatedAt: ago(0, 20),
  });

  // v19 — Booking 1 KOL: one chosen KOL per campaign.
  const breakfast = campaign({
    id: SEED_CAMPAIGN.breakfast,
    cover: coverOf('1641851962761', 'breakfast'),
    brandAccountId: SEED_BRAND_ID,
    name: 'Bữa sáng cùng sữa hạt',
    objective: 'Gợi ý bữa sáng nhanh cho gia đình bận rộn với sữa hạt.',
    brief: 'Một video YouTube 5–8 phút: chuẩn bị bữa sáng cho cả nhà trong 10 phút, có sữa hạt vị mới. Giọng kể gần gũi, không so sánh với thương hiệu khác.',
    budget: 0,
    startDate: day(-2),
    endDate: day(30),
    platforms: ['youtube'],
    categories: ['Ẩm thực', 'Gia đình'],
    deliverables: [{ type: 'VIDEO', platform: 'youtube', quantity: 1 }],
    contentRules: 'Gắn nhãn #QuangCao ở đầu video. Hiển thị sản phẩm rõ trong 5 giây đầu.',
    visibility: 'PRIVATE',
    status: 'OPEN',
    publishedAt: ago(1),
    createdAt: ago(3),
    updatedAt: ago(0, 20),
  });

  const officeMilk = campaign({
    id: SEED_CAMPAIGN.officeMilk,
    cover: coverOf('1684247969270', 'officeMilk'),
    brandAccountId: SEED_BRAND_ID,
    name: 'Sữa hạt cho dân văn phòng',
    objective: 'Đưa sữa hạt vào thói quen buổi sáng của người đi làm.',
    brief: '1 video TikTok 45–60 giây: phối đồ đi làm và mang theo hộp sữa hạt.',
    budget: 0,
    startDate: day(-24),
    endDate: day(10),
    platforms: ['tiktok'],
    categories: ['Lifestyle'],
    deliverables: [{ type: 'VIDEO', platform: 'tiktok', quantity: 1 }],
    contentRules: 'Gắn nhãn #QuangCao. Không khẳng định công dụng chữa bệnh.',
    visibility: 'PRIVATE',
    status: 'CLOSED',
    recruitmentClosedAt: ago(19, 4),
    log: [{ at: ago(19, 4), by: 'SYSTEM', action: 'CLOSED', note: 'Đã chọn KOL cho chiến dịch.' }],
    publishedAt: ago(21),
    createdAt: ago(23),
    updatedAt: ago(4),
  });

  const smoothie = campaign({
    id: SEED_CAMPAIGN.smoothie,
    cover: coverOf('1618480066690', 'smoothie'),
    brandAccountId: SEED_BRAND_ID,
    name: 'Công thức sinh tố sữa hạt',
    objective: 'Giới thiệu cách dùng sữa hạt trong đồ uống tại nhà.',
    brief: '1 video TikTok công thức sinh tố 3 phút với sữa hạt vị mới.',
    budget: 0,
    startDate: day(-26),
    endDate: day(-5),
    platforms: ['tiktok'],
    categories: ['Ẩm thực'],
    deliverables: [{ type: 'VIDEO', platform: 'tiktok', quantity: 1 }],
    contentRules: 'Gắn nhãn #QuangCao ở đầu video.',
    visibility: 'PRIVATE',
    status: 'CLOSED',
    recruitmentClosedAt: ago(21),
    log: [{ at: ago(21), by: 'SYSTEM', action: 'CLOSED', note: 'Đã chọn KOL cho chiến dịch.' }],
    publishedAt: ago(23),
    createdAt: ago(25),
    updatedAt: ago(9),
  });

  const marketplace = campaign({
    id: SEED_CAMPAIGN.marketplace,
    cover: coverOf('1618480066690', 'marketplace'),
    brandAccountId: SEED_BRAND_ID,
    name: 'Tuần lễ ẩm thực mùa thu',
    objective: 'Lan toả các món ăn mùa thu dùng sản phẩm sữa và tăng lượt ghé cửa hàng.',
    brief:
      'Mỗi nhà sáng tạo nấu một món mùa thu (bánh, chè, đồ uống nóng) có dùng sữa của nhãn hàng, quay tại bếp nhà hoặc quán quen. Giọng kể ấm áp, gần gũi.',
    budget: 150_000_000,
    startDate: day(5),
    endDate: day(40),
    platforms: ['tiktok', 'youtube'],
    categories: ['Ẩm thực', 'Lifestyle'],
    deliverables: [
      { type: 'VIDEO', platform: 'tiktok', quantity: 4 },
      { type: 'VIDEO', platform: 'youtube', quantity: 1 },
    ],
    contentRules: 'Gắn nhãn #QuangCao. Ghi rõ công thức trong phần mô tả. Không dùng nhạc có bản quyền.',
    visibility: 'MARKETPLACE',
    applyDeadline: day(10),
    status: 'OPEN',
    publishedAt: ago(3),
    createdAt: ago(5),
    updatedAt: ago(2),
  });

  const draft = campaign({
    id: SEED_CAMPAIGN.draft,
    cover: coverOf('1684247969270', 'draft'),
    brandAccountId: SEED_BRAND_ID,
    name: 'Tri ân khách hàng cuối năm',
    objective: 'Cảm ơn khách hàng thân thiết, giới thiệu hộp quà Tết.',
    brief: 'Ý tưởng sơ bộ: chuỗi video mở hộp quà Tết cùng gia đình. Sẽ bổ sung ngân sách và thời gian sau.',
    budget: 0,
    platforms: ['facebook'],
    categories: ['Gia đình'],
    deliverables: [],
    contentRules: '',
    visibility: 'PRIVATE',
    status: 'DRAFT',
    createdAt: ago(1, 3),
  });

  // v17 (EP-02): a campaign of the demo brand waiting for Admin review ("Duyệt chiến dịch" in the demo panel).
  const pendingReview = campaign({
    id: SEED_CAMPAIGN.pendingReview,
    cover: coverOf('1558722199', 'pendingReview'),
    brandAccountId: SEED_BRAND_ID,
    name: 'Ra mắt sữa chua uống vị trái cây',
    objective: 'Giới thiệu dòng sữa chua uống mới cho học sinh, sinh viên.',
    brief: 'Quay video uống thử trong giờ ra chơi hoặc sau giờ học, nêu 2 vị yêu thích. Không so sánh với sản phẩm khác.',
    budget: 40_000_000,
    startDate: day(10),
    endDate: day(40),
    platforms: ['tiktok'],
    categories: ['Ẩm thực'],
    deliverables: [{ type: 'VIDEO', platform: 'tiktok', quantity: 1 }],
    contentRules: 'Gắn nhãn #QuangCao.',
    visibility: 'MARKETPLACE',
    applyDeadline: day(8),
    status: 'PENDING_REVIEW',
    log: [{ at: ago(0, 2), by: 'BRAND', action: 'SUBMITTED' }],
    createdAt: ago(1),
    updatedAt: ago(0, 2),
  });

  // --- agency (marketplace only) ---
  const fashion = campaign({
    id: SEED_CAMPAIGN.agencyFashion,
    cover: coverOf('1558722199', 'agencyFashion'),
    brandAccountId: SEED_AGENCY_ID,
    name: 'Bộ sưu tập thời trang thu đông',
    objective: 'Giới thiệu bộ sưu tập thu đông cho khách hàng nữ 18–30 tuổi.',
    brief: 'Phối 3 set đồ từ bộ sưu tập cho đi làm, đi chơi và dạo phố. Ưu tiên video biến hình, ánh sáng tự nhiên.',
    budget: 120_000_000,
    startDate: day(7),
    endDate: day(37),
    platforms: ['tiktok', 'facebook'],
    categories: ['Thời trang', 'Làm đẹp'],
    deliverables: [
      { type: 'VIDEO', platform: 'tiktok', quantity: 3 },
      { type: 'POST', platform: 'facebook', quantity: 1 },
    ],
    contentRules: 'Gắn nhãn #QuangCao. Gắn link cửa hàng trong phần mô tả.',
    visibility: 'MARKETPLACE',
    applyDeadline: day(5),
    status: 'OPEN',
    publishedAt: ago(1, 6),
    createdAt: ago(2),
  });

  const english = campaign({
    id: SEED_CAMPAIGN.agencyEnglish,
    cover: coverOf('1758521540376', 'agencyEnglish'),
    brandAccountId: SEED_AGENCY_ID,
    name: 'Trải nghiệm ứng dụng học tiếng Anh',
    objective: 'Tăng lượt tải ứng dụng học tiếng Anh cho học sinh, sinh viên.',
    brief: 'Dùng thử ứng dụng 7 ngày và chia sẻ tiến bộ thật. Có mã giảm giá riêng cho người xem.',
    budget: 80_000_000,
    startDate: day(10),
    endDate: day(55),
    platforms: ['youtube'],
    categories: ['Giáo dục'],
    deliverables: [{ type: 'VIDEO', platform: 'youtube', quantity: 1 }],
    contentRules: 'Gắn nhãn #QuangCao. Không cam kết kết quả học tập cụ thể.',
    visibility: 'MARKETPLACE',
    applyDeadline: day(14),
    status: 'OPEN',
    publishedAt: ago(4),
    createdAt: ago(4, 2),
  });

  const travel = campaign({
    id: SEED_CAMPAIGN.agencyTravel,
    cover: coverOf('1698521688714', 'agencyTravel'),
    brandAccountId: SEED_AGENCY_ID,
    name: 'Khám phá du lịch miền Trung',
    objective: 'Quảng bá tour 4 ngày 3 đêm Đà Nẵng – Hội An – Huế.',
    brief: 'Ghi lại hành trình thực tế theo lịch trình tour, giới thiệu món ăn địa phương và điểm check-in.',
    budget: 200_000_000,
    startDate: day(15),
    endDate: day(75),
    platforms: ['youtube', 'facebook'],
    categories: ['Du lịch', 'Ẩm thực'],
    deliverables: [
      { type: 'VIDEO', platform: 'youtube', quantity: 1 },
      { type: 'LIVESTREAM', platform: 'facebook', quantity: 1 },
    ],
    contentRules: 'Gắn nhãn #QuangCao. Tôn trọng quy định tại di tích.',
    visibility: 'MARKETPLACE',
    status: 'OPEN',
    publishedAt: ago(6),
    createdAt: ago(7),
  });

  // --- v10: more marketplace campaigns (varied platforms, categories, budgets and deadlines) ---
  const yogurt = campaign({
    id: SEED_CAMPAIGN.yogurt,
    cover: coverOf('1641851962761', 'yogurt'),
    brandAccountId: SEED_BRAND_ID,
    name: 'Sữa chua uống cho dân văn phòng',
    objective: 'Đưa sữa chua uống vào thói quen giữa giờ của nhân viên văn phòng.',
    brief: 'Video ngắn "một ngày ở văn phòng": bữa sáng vội, giờ nghỉ giữa buổi, tăng ca — sữa chua uống xuất hiện tự nhiên ở mỗi khoảnh khắc.',
    budget: 45_000_000,
    startDate: day(4),
    endDate: day(25),
    platforms: ['tiktok'],
    categories: ['Lifestyle', 'Ẩm thực'],
    deliverables: [{ type: 'VIDEO', platform: 'tiktok', quantity: 3 }],
    contentRules: 'Gắn nhãn #QuangCao. Không nói về công dụng giảm cân.',
    visibility: 'MARKETPLACE',
    applyDeadline: day(1),
    status: 'OPEN',
    publishedAt: ago(5),
    createdAt: ago(6),
  });

  const livestream = campaign({
    id: SEED_CAMPAIGN.livestream,
    cover: coverOf('1585049303349', 'livestream'),
    brandAccountId: SEED_BRAND_ID,
    name: 'Livestream bếp nhà cuối tuần',
    objective: 'Bán hàng trực tiếp combo sữa và nguyên liệu làm bánh qua livestream.',
    brief: 'Hai buổi livestream tối thứ Bảy: vừa làm bánh cùng cả nhà vừa giới thiệu combo ưu đãi. Có mã giảm giá riêng cho người xem livestream.',
    budget: 70_000_000,
    startDate: day(8),
    endDate: day(30),
    platforms: ['facebook'],
    categories: ['Gia đình', 'Ẩm thực'],
    deliverables: [
      { type: 'LIVESTREAM', platform: 'facebook', quantity: 2 },
      { type: 'POST', platform: 'facebook', quantity: 1 },
    ],
    contentRules: 'Gắn nhãn #QuangCao. Đọc đúng giá và điều kiện ưu đãi. Livestream tối thiểu 60 phút.',
    visibility: 'MARKETPLACE',
    applyDeadline: day(6),
    status: 'OPEN',
    publishedAt: ago(1),
    createdAt: ago(1, 5),
  });

  const headphones = campaign({
    id: SEED_CAMPAIGN.agencyHeadphones,
    cover: coverOf('1772587003187', 'agencyHeadphones'),
    brandAccountId: SEED_AGENCY_ID,
    name: 'Đánh giá tai nghe không dây mới',
    objective: 'Tạo nội dung đánh giá chi tiết cho dòng tai nghe không dây sắp mở bán.',
    brief: 'Video đánh giá 10–15 phút: thiết kế, chất âm, chống ồn, thời lượng pin. Được giữ mẫu sau chiến dịch.',
    budget: 90_000_000,
    startDate: day(14),
    endDate: day(50),
    platforms: ['youtube'],
    categories: ['Công nghệ', 'Giải trí'],
    deliverables: [{ type: 'VIDEO', platform: 'youtube', quantity: 2 }],
    contentRules: 'Gắn nhãn #QuangCao. Đánh giá trung thực, không so sánh trực tiếp với sản phẩm cụ thể của hãng khác.',
    visibility: 'MARKETPLACE',
    applyDeadline: day(12),
    status: 'OPEN',
    publishedAt: ago(0, 5),
    createdAt: ago(0, 8),
  });

  const challenge = campaign({
    id: SEED_CAMPAIGN.agencyChallenge,
    cover: coverOf('1733945761533', 'agencyChallenge'),
    brandAccountId: SEED_AGENCY_ID,
    name: 'Thử thách 30 ngày nói tiếng Anh',
    objective: 'Lan toả thói quen luyện nói tiếng Anh mỗi ngày cho người đi làm trẻ.',
    brief: 'Chuỗi video TikTok ghi lại tiến bộ sau 30 ngày luyện nói cùng khoá học, kết thúc bằng một buổi livestream giao lưu trên Facebook.',
    budget: 250_000_000,
    startDate: day(21),
    endDate: day(60),
    platforms: ['tiktok', 'facebook'],
    categories: ['Giáo dục', 'Lifestyle'],
    deliverables: [
      { type: 'VIDEO', platform: 'tiktok', quantity: 4 },
      { type: 'LIVESTREAM', platform: 'facebook', quantity: 1 },
    ],
    contentRules: 'Gắn nhãn #QuangCao. Không cam kết điểm số hay chứng chỉ cụ thể.',
    visibility: 'MARKETPLACE',
    applyDeadline: day(20),
    status: 'OPEN',
    publishedAt: ago(2, 3),
    createdAt: ago(2, 6),
  });

  // --- bookings ---
  const thumb = (n: number) => IMAGE_POOL[n % IMAGE_POOL.length];
  const draftOf = (id: string, itemId: string, name: string, n: number, at: number, extra: Partial<ContentSubmission>): ContentSubmission => ({
    id,
    kind: 'DRAFT',
    itemId,
    title: extra.title ?? 'Bản nháp video',
    file: { name, type: 'video/mp4', size: 48_000_000 + n * 1_000_000, thumbnail: thumb(n) },
    safety: scanVideoFile(name, 75),
    status: 'PENDING',
    submittedAt: at,
    ...extra,
  });
  const postOf = (id: string, itemId: string, url: string, channelId: string, at: number): ContentSubmission => ({
    id,
    kind: 'POST',
    itemId,
    title: 'Bài đăng chính thức',
    url,
    status: 'APPROVED',
    metrics: postMetrics(url, followers(channelId)),
    verifiedAt: at,
    submittedAt: at,
  });
  const ev = (at: number, by: BookingEvent['by'], action: BookingEvent['action'], more: Partial<BookingEvent> = {}): BookingEvent => ({
    at,
    by,
    action,
    ...more,
  });
  const item = (id: string, n: number, channelId: string, platform: Platform, quantity = 1) => ({
    id,
    kolAccountId: kolAcc(n),
    kolId: kolId(n),
    channelId,
    platform,
    deliverableType: 'VIDEO' as const,
    quantity,
  });

  const review: Booking = {
    id: SEED_BOOKING.review,
    campaignId: running.id,
    brandAccountId: SEED_BRAND_ID,
    supplierType: 'MCN',
    supplierAccountId: SAOVIET,
    origin: 'INVITE',
    items: [item('bk-seed-review-i1', 12, mcnCh(2), 'youtube')],
    price: 50_000_000,
    note: 'Video YouTube 8–10 phút, lồng ghép 2 công thức bữa sáng.',
    status: 'CONTENT_REVIEW',
    history: [
      ev(ago(21), 'BRAND', 'INVITED', { price: 50_000_000, note: 'Mời kênh Tuấn Kiệt Vlog làm 1 video YouTube.' }),
      ev(ago(19), 'SUPPLIER', 'ACCEPTED', { price: 50_000_000 }),
      ev(ago(6), 'SUPPLIER', 'DRAFT_SUBMITTED', { note: 'Bữa sáng 10 phút với sữa hạt' }),
      ev(ago(5), 'BRAND', 'CHANGES_REQUESTED', { note: 'Cần gắn nhãn #QuangCao ở đầu video và bỏ câu "tốt hơn mọi loại sữa".' }),
      ev(ago(0, 20), 'SUPPLIER', 'DRAFT_SUBMITTED', { note: 'Bữa sáng 10 phút với sữa hạt (bản sửa)' }),
    ],
    contents: [
      draftOf('ct-seed-review-1', 'bk-seed-review-i1', 'bua-sang-10-phut.mp4', 3, ago(6), {
        title: 'Bữa sáng 10 phút với sữa hạt',
        status: 'CHANGES_REQUESTED',
        feedback: 'Cần gắn nhãn #QuangCao ở đầu video và bỏ câu "tốt hơn mọi loại sữa".',
        reviewedAt: ago(5),
      }),
      draftOf('ct-seed-review-2', 'bk-seed-review-i1', 'sua-hat-bua-sang.mp4', 4, ago(0, 20), {
        title: 'Bữa sáng 10 phút với sữa hạt (bản sửa)',
        note: 'Đã thêm nhãn #QuangCao và sửa lời thoại theo góp ý.',
      }),
    ],
    payment: {},
    acceptedAt: ago(19),
    createdAt: ago(21),
    updatedAt: ago(0, 20),
  };

  const verifiedUrl = 'https://www.tiktok.com/@baochau.phoido/video/7431200000000000001';
  const verified: Booking = {
    id: SEED_BOOKING.verified,
    campaignId: officeMilk.id,
    brandAccountId: SEED_BRAND_ID,
    supplierType: 'MCN',
    supplierAccountId: SAOVIET,
    origin: 'INVITE',
    items: [item('bk-seed-verified-i1', 13, mcnCh(4), 'tiktok')],
    price: 30_000_000,
    note: '1 video TikTok 45–60 giây, phong cách phối đồ đi làm kèm hộp sữa.',
    status: 'VERIFIED',
    history: [
      ev(ago(20), 'BRAND', 'INVITED', { price: 30_000_000 }),
      ev(ago(19, 4), 'SUPPLIER', 'ACCEPTED', { price: 30_000_000 }),
      ev(ago(12), 'SUPPLIER', 'DRAFT_SUBMITTED', { note: 'Sáng thứ Hai cùng sữa hạt' }),
      ev(ago(11), 'BRAND', 'CONTENT_APPROVED'),
      ev(ago(9), 'SUPPLIER', 'POST_SUBMITTED', { note: verifiedUrl }),
      ev(ago(9), 'SYSTEM', 'POST_VERIFIED', { note: verifiedUrl }),
    ],
    contents: [
      draftOf('ct-seed-verified-1', 'bk-seed-verified-i1', 'sang-thu-hai-cung-sua-hat.mp4', 5, ago(12), {
        title: 'Sáng thứ Hai cùng sữa hạt',
        status: 'APPROVED',
        reviewedAt: ago(11),
      }),
      postOf('ct-seed-verified-2', 'bk-seed-verified-i1', verifiedUrl, mcnCh(4), ago(9)),
    ],
    payment: {},
    acceptedAt: ago(19, 4),
    createdAt: ago(20),
    updatedAt: ago(9),
  };

  const completedUrl = 'https://www.tiktok.com/@minhthu.bepnha/video/7429800000000000002';
  const completed: Booking = {
    id: SEED_BOOKING.completed,
    campaignId: smoothie.id,
    brandAccountId: SEED_BRAND_ID,
    supplierType: 'MCN',
    supplierAccountId: SAOVIET,
    origin: 'INVITE',
    items: [item('bk-seed-completed-i1', 11, mcnCh(1), 'tiktok')],
    price: 30_000_000,
    note: '1 video TikTok công thức sinh tố sữa hạt.',
    status: 'COMPLETED',
    history: [
      ev(ago(22), 'BRAND', 'INVITED', { price: 30_000_000 }),
      ev(ago(21), 'SUPPLIER', 'ACCEPTED', { price: 30_000_000 }),
      ev(ago(17), 'SUPPLIER', 'DRAFT_SUBMITTED', { note: 'Sinh tố chuối sữa hạt 3 phút' }),
      ev(ago(16), 'BRAND', 'CONTENT_APPROVED'),
      ev(ago(14), 'SUPPLIER', 'POST_SUBMITTED', { note: completedUrl }),
      ev(ago(14), 'SYSTEM', 'POST_VERIFIED', { note: completedUrl }),
      ev(ago(10), 'BRAND', 'PAYMENT_MARKED', { price: 30_000_000 }),
      ev(ago(9), 'SUPPLIER', 'PAYMENT_CONFIRMED', { price: 30_000_000 }),
      ev(ago(8), 'BRAND', 'RATED'),
      ev(ago(8), 'SUPPLIER', 'RATED'),
    ],
    contents: [
      draftOf('ct-seed-completed-1', 'bk-seed-completed-i1', 'sinh-to-chuoi-sua-hat.mp4', 6, ago(17), {
        title: 'Sinh tố chuối sữa hạt 3 phút',
        status: 'APPROVED',
        reviewedAt: ago(16),
      }),
      postOf('ct-seed-completed-2', 'bk-seed-completed-i1', completedUrl, mcnCh(1), ago(14)),
    ],
    contractFile: { name: 'hop-dong-sao-viet-sua-hat.pdf', type: 'application/pdf', size: 420_000 },
    payment: { brandMarkedAt: ago(10), supplierConfirmedAt: ago(9) },
    ratings: {
      brand: { stars: 5, comment: 'Nộp nội dung đúng hạn, video tự nhiên.', at: ago(8) },
      supplier: { stars: 5, comment: 'Brief rõ ràng, duyệt nhanh.', at: ago(8) },
    },
    acceptedAt: ago(21),
    completedAt: ago(9),
    createdAt: ago(22),
    updatedAt: ago(8),
  };

  // Khánh Vy has no MCN channel → invited directly (supplierType KOL).
  const vyChannel = channels.find(
    (c) => c.ownerType === 'KOL' && c.ownerId === SEED_KHANHVY_ID && c.status === 'VERIFIED' && c.active && breakfast.platforms.includes(c.platform),
  );
  const khanhVy: Booking = {
    id: SEED_BOOKING.khanhVyInvite,
    campaignId: breakfast.id,
    brandAccountId: SEED_BRAND_ID,
    supplierType: 'KOL',
    supplierAccountId: SEED_KHANHVY_ID,
    origin: 'INVITE',
    items: [
      {
        id: 'bk-seed-khanhvy-i1',
        kolAccountId: SEED_KHANHVY_ID,
        kolId: kolId(1),
        ...(vyChannel ? { channelId: vyChannel.id } : {}),
        platform: vyChannel?.platform ?? 'tiktok',
        deliverableType: 'VIDEO',
        quantity: 1,
      },
    ],
    price: 50_000_000,
    note: 'Mong bạn chia sẻ một buổi sáng cùng gia đình với sữa hạt vị mới.',
    status: 'SENT',
    awaiting: 'SUPPLIER',
    history: [ev(ago(0, 20), 'BRAND', 'INVITED', { price: 50_000_000, note: 'Mong bạn chia sẻ một buổi sáng cùng gia đình với sữa hạt vị mới.' })],
    contents: [],
    payment: {},
    createdAt: ago(0, 20),
    updatedAt: ago(0, 20),
  };

  const application: Booking = {
    id: SEED_BOOKING.application,
    campaignId: marketplace.id,
    brandAccountId: SEED_BRAND_ID,
    supplierType: 'MCN',
    supplierAccountId: SAOVIET,
    origin: 'APPLICATION',
    items: [item('bk-seed-application-i1', 14, mcnCh(5), 'youtube'), item('bk-seed-application-i2', 11, mcnCh(6), 'tiktok', 2)],
    price: 40_000_000,
    note: 'Đề xuất 1 video YouTube công thức bánh bí đỏ và 2 video TikTok đồ uống nóng mùa thu.',
    status: 'APPLIED',
    awaiting: 'BRAND',
    history: [ev(ago(2), 'SUPPLIER', 'APPLIED', { price: 40_000_000 })],
    contents: [],
    payment: {},
    createdAt: ago(2),
    updatedAt: ago(2),
  };

  // Booking 1 KOL on the Sàn: more applicants for the marketplace campaign, the brand picks one.
  const ownChannel = (n: number, platforms: Platform[]) =>
    channels.find((c) => c.ownerType === 'KOL' && c.ownerId === kolAcc(n) && c.status === 'VERIFIED' && c.active && platforms.includes(c.platform));
  const extraApplications: Booking[] = [
    { n: 20, at: ago(1, 6), note: 'Mình làm 1 video công thức chè bí đỏ sữa tươi, quay tại bếp nhà.' },
    { n: 24, at: ago(0, 9), note: 'Đề xuất video đồ uống nóng mùa thu, đăng khung giờ tối.' },
  ].flatMap(({ n, at, note }, i) => {
    const ch = ownChannel(n, marketplace.platforms);
    if (!ch) return [];
    const id = `bk-seed-application-${i + 2}`;
    return [
      {
        id,
        campaignId: marketplace.id,
        brandAccountId: SEED_BRAND_ID,
        supplierType: 'KOL' as const,
        supplierAccountId: kolAcc(n),
        origin: 'APPLICATION' as const,
        items: [{ id: `${id}-i1`, kolAccountId: kolAcc(n), kolId: kolId(n), channelId: ch.id, platform: ch.platform, deliverableType: 'VIDEO' as const, quantity: 1 }],
        price: ch.platform === 'youtube' ? 25_000_000 : 15_000_000,
        note,
        status: 'APPLIED' as const,
        awaiting: 'BRAND' as const,
        history: [ev(at, 'SUPPLIER', 'APPLIED', { price: ch.platform === 'youtube' ? 25_000_000 : 15_000_000, note })],
        contents: [],
        payment: {},
        createdAt: at,
        updatedAt: at,
      },
    ];
  });

  const campaigns = [running, marketplace, breakfast, officeMilk, smoothie, draft, pendingReview, fashion, english, travel, yogurt, livestream, headphones, challenge];
  const recruit = seedRecruitment(
    campaigns,
    channels,
    now,
    { livestream: livestream.id, headphones: headphones.id, challenge: challenge.id, brand: SEED_BRAND_ID, agency: SEED_AGENCY_ID },
    coverOf,
  );

  // v13: past collaborations (verified posts, ratings, payments) for "Bài đã đăng" / "Thu nhập".
  const history = seedHistory(channels, now, { brand: SEED_BRAND_ID, khanhVy: SEED_KHANHVY_ID }, coverOf);

  // Fixed rewards matching the seeded bookings (one channel × group each): running = TikTok 30M, YouTube 50M
  // (Khánh Vy's invite is on her YouTube channel);
  // marketplace application = YouTube 25M + TikTok 15M; Khánh Vy's home-office post = YouTube 18M.
  const GROUPS: Record<string, DeliverableGroup[]> = {
    [running.id]: [
      { platform: 'tiktok', slots: 1, reward: { cash: 30_000_000 } },
      { platform: 'youtube', slots: 1, reward: { cash: 50_000_000 } },
      { platform: 'facebook', slots: 1, reward: { cash: 20_000_000 } },
    ],
    [marketplace.id]: [
      { platform: 'tiktok', slots: 1, reward: { cash: 15_000_000 } },
      { platform: 'youtube', slots: 1, reward: { cash: 25_000_000 } },
    ],
    [breakfast.id]: [{ platform: 'youtube', slots: 1, reward: { cash: 50_000_000 } }],
    [officeMilk.id]: [{ platform: 'tiktok', slots: 1, reward: { cash: 30_000_000 } }],
    [smoothie.id]: [{ platform: 'tiktok', slots: 1, reward: { cash: 30_000_000 } }],
    [SEED_HISTORY.homeOfficeCampaign]: [{ platform: 'youtube', slots: 1, reward: { cash: 18_000_000 } }],
  };

  return {
    campaigns: [...campaigns, ...recruit.campaigns, ...history.campaigns].map((c) => withGroups(c, GROUPS[c.id])),
    bookings: [review, verified, completed, khanhVy, application, ...extraApplications, ...recruit.bookings, ...history.bookings],
    campaignQuestions: recruit.questions,
    savedCampaigns: [
      { accountId: SAOVIET, campaignId: travel.id, savedAt: ago(1) },
      { accountId: SAOVIET, campaignId: yogurt.id, savedAt: ago(0, 3) },
      { accountId: SEED_KHANHVY_ID, campaignId: english.id, savedAt: ago(2) },
    ],
  };
}
