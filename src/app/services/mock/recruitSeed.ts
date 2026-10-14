// Seed v12: "Tuyển nhiều KOL" (open recruitment). Turns 3 marketplace campaigns into open recruitment (all in
// "Ứng tuyển" with a D-n countdown) and adds one in "Chọn lọc" with applicants to pick (demo brand) and one in
// "Đăng bài" with selected KOLs (agency), plus public Q&A. Fictional brands, products and addresses only.
import type { Platform } from '../bizTypes';
import {
  DEFAULT_TERMS,
  type ApplicationDetails,
  type Booking,
  type BookingEvent,
  type Campaign,
  type CampaignQA,
  type CampaignReward,
  type ContentSubmission,
  type Recruitment,
  type SurveyQuestion,
} from '../campaign-types';
import type { Channel } from '../profile-types';
import { isoDay, postMetrics } from './campaignRules';
import { VERIFIED_MCN_ACCOUNT_ID, VERIFIED_MCN_ID } from './mcnSeed';
import { isRecruit, rewardValue } from './recruitment';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const SAOVIET = VERIFIED_MCN_ACCOUNT_ID;
const KHANHVY = 'acc-kol-2026-0001';
const kolAcc = (n: number) => `acc-kol-2026-${String(n).padStart(4, '0')}`;
const kolId = (n: number) => `KOL-2026-${String(n).padStart(4, '0')}`;
const mcnCh = (n: number) => `${VERIFIED_MCN_ID}-ch-${String(n).padStart(2, '0')}`;

export const SEED_RECRUIT = {
  /** Demo brand, "Chọn lọc": 3 slots, 1 picked, 4 applicants to pick, 1 not picked. Product + cash, survey. */
  selecting: 'cmp-seed-tuyen-chon',
  /** Agency, "Đăng bài": Workflow off (post directly), product + cash, 3 picked KOLs at different steps. */
  posting: 'cmp-seed-dang-bai',
} as const;

export const SEED_RECRUIT_BOOKING = {
  /** Khánh Vy, picked on the posting campaign: product sent, waiting for "Đã nhận sản phẩm" then the post. */
  khanhVyPicked: 'bk-seed-rc-khanhvy',
  /** Sao Việt, picked on the posting campaign: post verified, waiting for payment. */
  saoVietVerified: 'bk-seed-rc-saoviet',
  /** Sao Việt's application on the selecting campaign. */
  saoVietApplied: 'bk-seed-rc-saoviet-ap',
  /** v20 — "Đánh giá tai nghe không dây mới" (agency, in "Ứng tuyển"): demo of the whole flow from applications. */
  headphonesWaiting: 'bk-seed-rc-tai-nghe-1',
  headphonesPicked: 'bk-seed-rc-tai-nghe-4',
  headphonesProducing: 'bk-seed-rc-tai-nghe-5',
} as const;

const defaultTerms = () => DEFAULT_TERMS.map((text, i) => ({ id: `t-${i + 1}`, text }));

/** Timeline from day offsets [applyStart, applyEnd, selectStart, selectEnd, postStart, postEnd, reviewStart, reviewEnd]. */
function timeline(now: number, d: [number, number, number, number, number, number, number, number]): Recruitment['timeline'] {
  const day = (n: number) => isoDay(now + n * DAY);
  return {
    applyStart: day(d[0]),
    applyEnd: day(d[1]),
    selectStart: day(d[2]),
    selectEnd: day(d[3]),
    postStart: day(d[4]),
    postEnd: day(d[5]),
    reviewStart: day(d[6]),
    reviewEnd: day(d[7]),
  };
}

/** Sets type, recruitment and the derived fields (start / end / applyDeadline / budget / MARKETPLACE). */
function asRecruit(c: Campaign, r: Recruitment, extra: Partial<Campaign>): Campaign {
  const out: Campaign = { ...c, ...extra, type: 'OPEN_RECRUITMENT', recruitment: r, visibility: 'MARKETPLACE' };
  out.startDate = r.timeline.applyStart;
  out.endDate = r.timeline.reviewEnd;
  out.applyDeadline = r.timeline.applyEnd;
  out.budget = r.slots * rewardValue(r.reward);
  return out;
}

/**
 * Converts the given marketplace campaigns (in place in the list) and returns the new campaigns, bookings and Q&A.
 * `byId` must hold the seeded campaigns `cmp-seed-livestream-bep`, `cmp-seed-tai-nghe`, `cmp-seed-thu-thach-tieng-anh`.
 */
export function seedRecruitment(
  campaigns: Campaign[],
  channels: Channel[],
  now: number,
  ids: { livestream: string; headphones: string; challenge: string; brand: string; agency: string },
  cover: (photoId: string, slug: string) => Campaign['cover'],
): { campaigns: Campaign[]; bookings: Booking[]; questions: CampaignQA[] } {
  const ago = (days: number, hours = 0) => now - days * DAY - hours * HOUR;
  const replace = (id: string, fn: (c: Campaign) => Campaign) => {
    const i = campaigns.findIndex((c) => c.id === id);
    if (i >= 0) campaigns[i] = fn(campaigns[i]);
  };
  const followers = (id: string) => channels.find((c) => c.id === id)?.stats?.followers ?? 0;

  // --- 3 converted campaigns, all in "Ứng tuyển" ---
  replace(ids.livestream, (c) =>
    asRecruit(
      c,
      {
        slots: 5,
        reward: { cash: 12_000_000, product: { name: 'Combo nguyên liệu làm bánh', value: 2_000_000, note: 'Gửi trước buổi livestream đầu tiên.' } },
        timeline: timeline(now, [-1, 6, 7, 9, 10, 24, 25, 30]),
      },
      {
        regions: ['Hà Nội', 'TP. Hồ Chí Minh'],
        target: { ageMin: 22, ageMax: 45, minFollowers: 20_000 },
        survey: [{ id: 'q-1', text: 'Bạn dự kiến livestream vào khung giờ nào?', required: true }],
        terms: defaultTerms(),
        draftReview: true,
      },
    ),
  );
  replace(ids.headphones, (c) =>
    asRecruit(
      c,
      {
        slots: 6,
        reward: { cash: 10_000_000, product: { name: 'Tai nghe không dây mẫu mới', value: 5_000_000, note: 'KOL được giữ tai nghe sau chiến dịch.' } },
        timeline: timeline(now, [-1, 12, 13, 15, 16, 40, 41, 50]),
      },
      {
        regions: [],
        target: { ageMin: 18, ageMax: 35, minFollowers: 50_000 },
        survey: [
          { id: 'q-1', text: 'Kênh của bạn từng đánh giá tai nghe hoặc thiết bị âm thanh chưa? Gửi link nếu có.', required: true },
          { id: 'q-2', text: 'Bạn muốn thử nghiệm tai nghe trong bối cảnh nào (đi làm, tập thể thao, chơi game…)?', required: false },
        ],
        terms: defaultTerms(),
        draftReview: true,
      },
    ),
  );
  replace(ids.challenge, (c) =>
    asRecruit(
      c,
      { slots: 10, reward: { cash: 25_000_000 }, timeline: timeline(now, [-2, 20, 21, 23, 24, 50, 51, 60]) },
      { regions: [], target: { ageMin: 20, ageMax: 30 }, survey: [], terms: defaultTerms(), draftReview: false },
    ),
  );

  // --- "Chọn lọc" (demo brand) ---
  const selectingReward: CampaignReward = {
    cash: 3_000_000,
    product: { name: 'Máy làm sữa hạt mini', value: 2_500_000, note: 'Giao tận nơi trong 3 ngày sau khi được chọn.' },
  };
  const selectingSurvey: SurveyQuestion[] = [
    { id: 'q-1', text: 'Gia đình bạn thường dùng sữa hạt vào bữa nào?', required: true },
    { id: 'q-2', text: 'Ý tưởng video của bạn trong 1–2 câu.', required: false },
  ];
  const selecting = asRecruit(
    {
      id: SEED_RECRUIT.selecting,
      brandAccountId: ids.brand,
      cover: cover('1549733539', 'tuyen-chon'),
      name: 'Trải nghiệm máy làm sữa hạt mini tại nhà',
      objective: 'Lan toả thói quen tự làm sữa hạt tại nhà cùng máy làm sữa hạt mini của nhãn hàng.',
      brief:
        'Quay một buổi sáng làm sữa hạt cùng máy mini: chọn hạt, xay, rót ra ly. Kể cảm nhận thật về hương vị và thời gian chuẩn bị. Không cần dựng cảnh cầu kỳ.',
      budget: 0,
      platforms: ['tiktok', 'facebook'],
      categories: ['Ẩm thực', 'Gia đình'],
      deliverables: [{ type: 'VIDEO', platform: 'tiktok', quantity: 1 }],
      contentRules: 'Gắn nhãn #QuangCao. Quay cận cảnh máy khi đang xay. Không khẳng định công dụng chữa bệnh.',
      visibility: 'MARKETPLACE',
      status: 'CLOSED', // past "Ứng tuyển" → Đã đóng tuyển (EP-02 §8)
      recruitmentClosedAt: ago(1),
      log: [{ at: ago(1), by: 'SYSTEM', action: 'CLOSED', note: 'Hết hạn ứng tuyển.' }],
      publishedAt: ago(10),
      createdAt: ago(12),
      updatedAt: ago(1),
    },
    { slots: 3, reward: selectingReward, timeline: timeline(now, [-10, -1, 0, 3, 4, 20, 21, 27]) },
    {
      regions: [],
      target: { ageMin: 22, ageMax: 40, gender: 'FEMALE', minFollowers: 10_000 },
      survey: selectingSurvey,
      terms: defaultTerms(),
      draftReview: true,
    },
  );

  // --- "Đăng bài" (agency), Workflow off ---
  const postingReward: CampaignReward = { cash: 2_000_000, product: { name: 'Bình giữ nhiệt thể thao 750 ml', value: 450_000 } };
  const posting = asRecruit(
    {
      id: SEED_RECRUIT.posting,
      brandAccountId: ids.agency,
      cover: cover('1684247969270', 'dang-bai'),
      name: 'Review bình giữ nhiệt cho người chạy bộ',
      objective: 'Giới thiệu bình giữ nhiệt mới tới cộng đồng chạy bộ và tập luyện ngoài trời.',
      brief: 'Mang bình theo một buổi chạy hoặc tập: giữ lạnh bao lâu, cầm có chắc tay không, có vừa hộc xe không. Nói thật cả điểm chưa thích.',
      budget: 0,
      platforms: ['tiktok', 'youtube', 'facebook'],
      categories: ['Thể thao', 'Lifestyle'],
      deliverables: [{ type: 'VIDEO', platform: 'tiktok', quantity: 1 }],
      contentRules: 'Gắn nhãn #QuangCao và hashtag #BinhGiuNhietChayBo. Đăng trực tiếp, không cần gửi bản nháp.',
      visibility: 'MARKETPLACE',
      status: 'CLOSED',
      recruitmentClosedAt: ago(12),
      log: [{ at: ago(12), by: 'SYSTEM', action: 'CLOSED', note: 'Hết hạn ứng tuyển.' }],
      publishedAt: ago(21),
      createdAt: ago(23),
      updatedAt: ago(2),
    },
    { slots: 4, reward: postingReward, timeline: timeline(now, [-20, -12, -11, -8, -7, 10, 11, 15]) },
    { regions: [], target: { minFollowers: 5_000 }, survey: [], terms: defaultTerms(), draftReview: false },
  );

  // --- applicants ---
  /** A verified, active channel of an independent KOL on one of `platforms` (never a kids channel). */
  const ownChannel = (n: number, platforms: Platform[]) =>
    channels.find(
      (c) =>
        c.ownerType === 'KOL' &&
        c.ownerId === kolAcc(n) &&
        c.status === 'VERIFIED' &&
        c.active &&
        platforms.includes(c.platform) &&
        !/kid/i.test(`${c.handle} ${c.url}`),
    );
  const ev = (at: number, by: BookingEvent['by'], action: BookingEvent['action'], more: Partial<BookingEvent> = {}): BookingEvent => ({ at, by, action, ...more });
  const application = (answers: string[], survey: SurveyQuestion[], shipping: ApplicationDetails['shipping'], at: number): ApplicationDetails => ({
    answers: survey.map((q, i) => ({ questionId: q.id, question: q.text, answer: answers[i] ?? '' })),
    acceptedTerms: [...DEFAULT_TERMS],
    termsAcceptedAt: at,
    ...(shipping ? { shipping } : {}),
  });
  const SHIP = [
    { province: 'Hà Nội', address: 'Số 12 ngõ Mẫu 1, phường Demo, Hà Nội', phone: '0900000101' },
    { province: 'TP. Hồ Chí Minh', address: 'Số 45 đường Mẫu 2, phường Thử Nghiệm, TP. Hồ Chí Minh', phone: '0900000102' },
    { province: 'Đà Nẵng', address: 'Số 8 đường Mẫu 3, phường Ví Dụ, Đà Nẵng', phone: '0900000103' },
    { province: 'Cần Thơ', address: 'Số 21 đường Mẫu 4, phường Minh Hoạ, Cần Thơ', phone: '0900000104' },
    { province: 'Hải Phòng', address: 'Số 3 ngõ Mẫu 5, phường Demo, Hải Phòng', phone: '0900000105' },
    { province: 'Huế', address: 'Số 17 đường Mẫu 6, phường Thử Nghiệm, Huế', phone: '0900000106' },
  ];
  const ANSWERS = [
    ['Bữa sáng trước khi đưa cả nhà đi làm.', 'Một ngày bận rộn vẫn kịp ly sữa hạt nóng trong 15 phút.'],
    ['Bữa phụ buổi chiều.', 'So sánh sữa hạt tự làm với sữa mua sẵn về độ ngọt.'],
    ['Cuối tuần, cả nhà cùng làm.', ''],
    ['Bữa sáng.', 'Thử 3 công thức hạt khác nhau trong một tuần.'],
    ['Sau buổi tập thể dục sáng.', 'Ly sữa hạt sau buổi chạy bộ.'],
  ];

  type Applicant = { supplierType: 'KOL' | 'MCN'; supplierAccountId: string; kolN: number; channelId: string; platform: Platform };
  const independents = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36]
    .map((n) => ({ n, ch: ownChannel(n, ['tiktok', 'facebook']) }))
    .filter((x): x is { n: number; ch: Channel } => !!x.ch);
  const vyCh = ownChannel(1, ['tiktok', 'facebook']);
  const applicants: Applicant[] = [
    { supplierType: 'MCN', supplierAccountId: SAOVIET, kolN: 11, channelId: mcnCh(1), platform: 'tiktok' },
    ...independents.slice(0, 5).map((x) => ({ supplierType: 'KOL' as const, supplierAccountId: kolAcc(x.n), kolN: x.n, channelId: x.ch.id, platform: x.ch.platform })),
  ];

  const bookings: Booking[] = [];
  const base = (id: string, campaignId: string, brand: string, a: Applicant, createdAt: number): Booking => ({
    id,
    campaignId,
    brandAccountId: brand,
    supplierType: a.supplierType,
    supplierAccountId: a.supplierAccountId,
    origin: 'APPLICATION',
    items: [{ id: `${id}-i1`, kolAccountId: kolAcc(a.kolN), kolId: kolId(a.kolN), channelId: a.channelId, platform: a.platform, deliverableType: 'VIDEO', quantity: 1 }],
    price: 0,
    note: '',
    status: 'APPLIED',
    awaiting: 'BRAND',
    history: [ev(createdAt, 'SUPPLIER', 'APPLIED')],
    contents: [],
    payment: {},
    createdAt,
    updatedAt: createdAt,
  });

  // Selecting campaign: Sao Việt + 3 KOLs waiting, 1 KOL picked, 1 KOL not picked.
  applicants.forEach((a, i) => {
    const at = ago(9 - i, 2 + i);
    const id = i === 0 ? SEED_RECRUIT_BOOKING.saoVietApplied : `bk-seed-rc-chon-${i}`;
    const b = base(id, selecting.id, ids.brand, a, at);
    b.note = i === 0 ? 'Đề xuất một kênh TikTok về đời sống gia đình trong mạng lưới của chúng tôi.' : '';
    b.application = application(ANSWERS[i % ANSWERS.length], selectingSurvey, SHIP[i % SHIP.length], at);
    if (i === 4) {
      // Picked yesterday-ish (start of "Chọn lọc").
      b.status = 'ACCEPTED';
      delete b.awaiting;
      b.price = selectingReward.cash;
      b.reward = structuredClone(selectingReward);
      b.acceptedAt = ago(0, 3);
      b.updatedAt = ago(0, 3);
      b.history.push(ev(ago(0, 3), 'BRAND', 'SELECTED', { price: selectingReward.cash }));
    } else if (i === 5) {
      b.status = 'DECLINED';
      delete b.awaiting;
      b.updatedAt = ago(0, 2);
      b.history.push(ev(ago(0, 2), 'BRAND', 'NOT_SELECTED', { note: 'Không được chọn' }));
    }
    bookings.push(b);
  });

  // Posting campaign (Workflow off): Khánh Vy picked (product sent), Sao Việt verified, 1 KOL picked (product not sent), 2 not picked.
  const pick = (b: Booking, at: number) => {
    b.status = 'ACCEPTED';
    delete b.awaiting;
    b.price = postingReward.cash;
    b.reward = structuredClone(postingReward);
    b.acceptedAt = at;
    b.updatedAt = at;
    b.history.push(ev(at, 'BRAND', 'SELECTED', { price: postingReward.cash }));
  };
  if (vyCh) {
    const vy = base(SEED_RECRUIT_BOOKING.khanhVyPicked, posting.id, ids.agency, { supplierType: 'KOL', supplierAccountId: KHANHVY, kolN: 1, channelId: vyCh.id, platform: vyCh.platform }, ago(18));
    vy.application = application([], [], undefined, ago(18));
    vy.application.shipping = { ...SHIP[1] };
    pick(vy, ago(10));
    vy.shipment = { sentAt: ago(1, 4) };
    vy.history.push(ev(ago(1, 4), 'BRAND', 'PRODUCT_SENT', { note: postingReward.product!.name }));
    vy.updatedAt = ago(1, 4);
    bookings.push(vy);
  }
  const sv = base(SEED_RECRUIT_BOOKING.saoVietVerified, posting.id, ids.agency, { supplierType: 'MCN', supplierAccountId: SAOVIET, kolN: 13, channelId: mcnCh(4), platform: 'tiktok' }, ago(17));
  sv.application = application([], [], { ...SHIP[0] }, ago(17));
  pick(sv, ago(10));
  sv.shipment = { sentAt: ago(9), receivedAt: ago(7) };
  const postUrl = 'https://www.tiktok.com/@baochau.phoido/video/7432100000000000003';
  const post: ContentSubmission = {
    id: 'ct-seed-rc-saoviet-post',
    kind: 'POST',
    itemId: `${sv.id}-i1`,
    title: 'Chạy 5 km cùng bình giữ nhiệt',
    url: postUrl,
    status: 'APPROVED',
    metrics: postMetrics(postUrl, followers(mcnCh(4))),
    verifiedAt: ago(3),
    submittedAt: ago(3),
  };
  sv.contents.push(post);
  sv.status = 'VERIFIED';
  sv.history.push(
    ev(ago(9), 'BRAND', 'PRODUCT_SENT', { note: postingReward.product!.name }),
    ev(ago(7), 'SUPPLIER', 'PRODUCT_RECEIVED', { note: postingReward.product!.name }),
    ev(ago(3), 'SUPPLIER', 'POST_SUBMITTED', { note: postUrl }),
    ev(ago(3), 'SYSTEM', 'POST_VERIFIED', { note: postUrl }),
  );
  sv.updatedAt = ago(3);
  bookings.push(sv);

  const runners = [30, 31, 32, 33, 34, 35, 36, 29, 28, 27]
    .map((n) => ({ n, ch: ownChannel(n, ['tiktok', 'youtube', 'facebook']) }))
    .filter((x): x is { n: number; ch: Channel } => !!x.ch && !applicants.some((a) => a.kolN === x.n));
  runners.slice(0, 3).forEach((x, i) => {
    const b = base(`bk-seed-rc-dang-${i + 1}`, posting.id, ids.agency, { supplierType: 'KOL', supplierAccountId: kolAcc(x.n), kolN: x.n, channelId: x.ch.id, platform: x.ch.platform }, ago(16 - i));
    b.application = application([], [], { ...SHIP[(i + 2) % SHIP.length] }, ago(16 - i));
    if (i === 0) pick(b, ago(10));
    else {
      b.status = 'DECLINED';
      delete b.awaiting;
      b.updatedAt = ago(9);
      b.history.push(ev(ago(9), 'BRAND', 'NOT_SELECTED', { note: 'Không được chọn' }));
    }
    bookings.push(b);
  });

  // --- public Q&A ---
  const qa = (id: string, campaignId: string, askerAccountId: string, askerName: string, question: string, at: number, answer?: string, answeredAt?: number): CampaignQA => ({
    id,
    campaignId,
    askerAccountId,
    askerName,
    question,
    createdAt: at,
    ...(answer ? { answer, answeredAt } : {}),
  });
  const questions: CampaignQA[] = [
    qa('qa-seed-1', selecting.id, KHANHVY, 'Khánh Vy', 'Máy có kèm sẵn hạt để làm thử không ạ?', ago(8), 'Có. Mỗi KOL nhận kèm 3 gói hạt hạnh nhân, óc chó và đậu nành để quay.', ago(7)),
    qa('qa-seed-2', selecting.id, SAOVIET, 'Sao Việt Media', 'Video có cần quay giọng nói thật hay dùng nhạc nền được không?', ago(6), 'Ưu tiên giọng nói thật để người xem cảm nhận trải nghiệm. Nhạc nền nhẹ vẫn được.', ago(5)),
    qa('qa-seed-3', ids.headphones, KHANHVY, 'Khánh Vy', 'Kênh TikTok có được ứng tuyển không, hay chỉ YouTube?', ago(0, 20), 'Chiến dịch này chỉ nhận kênh YouTube vì cần video đánh giá dài.', ago(0, 18)),
    qa('qa-seed-4', ids.headphones, SAOVIET, 'Sao Việt Media', 'Thời gian giao tai nghe dự kiến là bao lâu sau khi được chọn?', ago(0, 6)),
    qa('qa-seed-5', posting.id, SAOVIET, 'Sao Việt Media', 'Có cần gửi bản nháp trước khi đăng không?', ago(15), 'Không cần. Chiến dịch đăng trực tiếp, chỉ cần gửi link sau khi đăng.', ago(14)),
  ];

  // v20 — "Đánh giá tai nghe không dây mới" (agency, YouTube, still in "Ứng tuyển"): KOL applications to run the whole
  // flow in the demo — 3 waiting to be reviewed, 1 picked (product still to send), Khánh Vy picked with the product
  // received (she can submit a draft). Selection is continuous (EP-02 §13): the brand may pick before the apply phase ends.
  const headphones = campaigns.find((c) => c.id === ids.headphones);
  if (headphones && isRecruit(headphones)) {
    const reward = headphones.recruitment.reward;
    const survey = headphones.survey ?? [];
    const HEADPHONE_ANSWERS = [
      ['Có, mình đã review 3 mẫu tai nghe chống ồn năm nay.', 'Đi làm bằng tàu điện và chạy bộ buổi sáng.'],
      ['Chưa, nhưng kênh mình chuyên đồ công nghệ cho dân văn phòng.', 'Làm việc ở quán cà phê ồn.'],
      ['Có, video so sánh tai nghe dưới 3 triệu được 120 nghìn lượt xem.', 'Chơi game và gọi họp online.'],
      ['Mình từng làm video về loa và micro thu âm.', ''],
      ['Có, mình review thiết bị âm thanh hằng tuần.', 'Tập gym và đi xe máy đường dài.'],
    ];
    // Khánh Vy (demo KOL login) is the picked KOL with the product received: log in as her to submit the draft.
    const vyYoutube = ownChannel(1, ['youtube']);
    const youtubers = Array.from({ length: 60 }, (_, i) => i + 16)
      .map((n) => ({ n, ch: ownChannel(n, ['youtube']) }))
      .filter((x): x is { n: number; ch: Channel } => !!x.ch)
      .slice(0, vyYoutube ? 4 : 5);
    if (vyYoutube) youtubers.push({ n: 1, ch: vyYoutube });
    youtubers.forEach(({ n, ch }, i) => {
      const at = ago(1, 10 - i * 2);
      const id = `bk-seed-rc-tai-nghe-${i + 1}`;
      const who = n === 1 ? KHANHVY : kolAcc(n);
      const b = base(id, headphones.id, ids.agency, { supplierType: 'KOL', supplierAccountId: who, kolN: n, channelId: ch.id, platform: ch.platform }, at);
      b.note = i === 0 ? 'Mình có thể quay một tuần dùng thật, đăng trong giờ vàng tối.' : '';
      b.application = application(HEADPHONE_ANSWERS[i], survey, SHIP[i % SHIP.length], at);
      if (i >= 3) {
        const picked = ago(0, 6 - i);
        b.status = 'ACCEPTED';
        delete b.awaiting;
        b.price = reward.cash;
        b.reward = structuredClone(reward);
        b.acceptedAt = picked;
        b.updatedAt = picked;
        b.history.push(ev(picked, 'BRAND', 'SELECTED', { price: reward.cash }));
        if (i === 4) {
          b.shipment = { sentAt: ago(0, 1), receivedAt: ago(0, 0.5) };
          b.history.push(ev(ago(0, 1), 'BRAND', 'PRODUCT_SENT', { note: reward.product?.name }), ev(ago(0, 0.5), 'SUPPLIER', 'PRODUCT_RECEIVED'));
          b.updatedAt = ago(0, 0.5);
        }
      }
      bookings.push(b);
    });
  }

  return { campaigns: [selecting, posting], bookings, questions };
}
