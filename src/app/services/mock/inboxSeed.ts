// v14 seed of "Tin nhắn" / "Thông báo": a few realistic threads on the seeded bookings of Khánh Vy, Sao Việt Media,
// the demo brand ("Công ty Demo Sữa") and the agency, plus notification read state (older notifications read).
import type { BookingMessage, NotificationReadState, ThreadRead } from '../inbox-types';
import { SEED_AGENCY_ID, SEED_BOOKING, SEED_BRAND_ID, SEED_KHANHVY_ID } from './campaignSeed';
import { VERIFIED_MCN_ACCOUNT_ID as SAOVIET } from './mcnSeed';
import { SEED_RECRUIT_BOOKING } from './recruitSeed';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const MIN = 60_000;

/** Ids of seeded threads (booking ids), for links and tests. */
export const SEED_THREADS = {
  /** Demo brand → Khánh Vy, open invite: 2 brand messages unread for Khánh Vy. */
  khanhVyInvite: SEED_BOOKING.khanhVyInvite,
  /** Demo brand ↔ Sao Việt, draft in review: last message from Sao Việt unread for the brand. */
  saoVietReview: SEED_BOOKING.review,
  /** Demo brand ↔ Sao Việt, verified post waiting for payment: all read. */
  saoVietVerified: SEED_BOOKING.verified,
  /** Agency ↔ Khánh Vy, product sent: 1 agency message unread for Khánh Vy. */
  khanhVyRecruit: SEED_RECRUIT_BOOKING.khanhVyPicked,
} as const;

export function seedInbox(
  now: number,
  bookingIds: Set<string>,
): { bookingMessages: BookingMessage[]; threadReads: ThreadRead[]; notificationReads: NotificationReadState[] } {
  const ago = (ms: number) => now - ms;
  let n = 0;
  const msg = (bookingId: string, from: 'BRAND' | 'SUPPLIER', authorAccountId: string, at: number, text: string, link?: string): BookingMessage => ({
    id: `msg-seed-${++n}`,
    bookingId,
    from,
    authorAccountId,
    text,
    ...(link ? { link } : {}),
    at,
  });

  const all: BookingMessage[] = [
    // Demo brand → Khánh Vy (invite sent 20 hours ago).
    msg(
      SEED_THREADS.khanhVyInvite,
      'BRAND',
      SEED_BRAND_ID,
      ago(19 * HOUR),
      'Chào Khánh Vy, bên mình rất thích các video bữa sáng gia đình của bạn. Bạn xem brief giúp mình nhé, nếu cần chỉnh giá cứ đề xuất lại.',
    ),
    msg(
      SEED_THREADS.khanhVyInvite,
      'BRAND',
      SEED_BRAND_ID,
      ago(3 * HOUR),
      'Bên mình gửi thêm bộ ảnh sản phẩm để bạn tham khảo khi lên kịch bản.',
      'https://drive.example.com/kolhub-demo/sua-hat-anh-san-pham',
    ),

    // Demo brand ↔ Sao Việt Media (draft in review).
    msg(SEED_THREADS.saoVietReview, 'SUPPLIER', SAOVIET, ago(2 * DAY), 'Chào chị, bên em đã nộp bản nháp đầu tiên cho video TikTok. Chị góp ý giúp em nhé.'),
    msg(
      SEED_THREADS.saoVietReview,
      'BRAND',
      SEED_BRAND_ID,
      ago(2 * DAY - 3 * HOUR),
      'Cảm ơn em. Chị đã ghi góp ý trong phần nội dung: cần đưa sản phẩm vào 5 giây đầu và thêm nhãn #QuangCao.',
    ),
    msg(
      SEED_THREADS.saoVietReview,
      'SUPPLIER',
      SAOVIET,
      ago(40 * MIN),
      'Bên em đã sửa xong và nộp lại bản nháp mới. Chị duyệt giúp em trong hôm nay được không ạ?',
    ),

    // Demo brand ↔ Sao Việt Media (verified, waiting for payment).
    msg(SEED_THREADS.saoVietVerified, 'SUPPLIER', SAOVIET, ago(8 * DAY), 'Bài đăng đã lên và được hệ thống xác minh. Chị kiểm tra giúp em số liệu nhé.'),
    msg(
      SEED_THREADS.saoVietVerified,
      'BRAND',
      SEED_BRAND_ID,
      ago(7 * DAY),
      'Số liệu tốt lắm em. Kế toán bên chị sẽ chuyển khoản theo hợp đồng trong tuần này, chị sẽ đánh dấu trên KOL Hub sau khi chuyển.',
    ),

    // Agency ↔ Khánh Vy (open recruitment, product sent).
    msg(SEED_THREADS.khanhVyRecruit, 'SUPPLIER', SEED_KHANHVY_ID, ago(9 * DAY), 'Cảm ơn anh chị đã chọn em. Địa chỉ nhận hàng em đã điền trong đơn ứng tuyển ạ.'),
    msg(
      SEED_THREADS.khanhVyRecruit,
      'BRAND',
      SEED_AGENCY_ID,
      ago(1 * DAY + 3 * HOUR),
      'Bên mình đã gửi sản phẩm qua đơn vị vận chuyển, dự kiến 2–3 ngày tới nơi. Nhận được hàng bạn bấm "Đã nhận sản phẩm" giúp mình nhé.',
    ),
  ];
  const bookingMessages = all.filter((m) => bookingIds.has(m.bookingId));

  const threadReads: ThreadRead[] = [
    { accountId: SEED_BRAND_ID, bookingId: SEED_THREADS.saoVietReview, readAt: ago(2 * DAY - 3 * HOUR) },
    { accountId: SAOVIET, bookingId: SEED_THREADS.saoVietReview, readAt: ago(40 * MIN) },
    { accountId: SEED_BRAND_ID, bookingId: SEED_THREADS.saoVietVerified, readAt: ago(7 * DAY) },
    { accountId: SAOVIET, bookingId: SEED_THREADS.saoVietVerified, readAt: ago(7 * DAY) },
    { accountId: SEED_KHANHVY_ID, bookingId: SEED_THREADS.khanhVyRecruit, readAt: ago(9 * DAY) },
    { accountId: SEED_AGENCY_ID, bookingId: SEED_THREADS.khanhVyRecruit, readAt: ago(1 * DAY + 3 * HOUR) },
    { accountId: SEED_BRAND_ID, bookingId: SEED_THREADS.khanhVyInvite, readAt: ago(3 * HOUR) },
  ].filter((r) => bookingIds.has(r.bookingId));

  // Notifications older than 2 days count as read, so the bell shows only the recent ones.
  const notificationReads: NotificationReadState[] = [SEED_KHANHVY_ID, SAOVIET, SEED_BRAND_ID, SEED_AGENCY_ID].map((accountId) => ({
    accountId,
    readAllAt: ago(2 * DAY),
    readIds: [],
  }));

  return { bookingMessages, threadReads, notificationReads };
}
