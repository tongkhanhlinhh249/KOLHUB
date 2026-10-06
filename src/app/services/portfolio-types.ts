// "Bài đã đăng" (portfolio): verified posts of a KOL/MCN from bookings, with a per-post "Hiện trên hồ sơ" switch.
// Brands see only the shown posts on the KOL profile (no price, campaign name or ratings).
import type { Platform } from './bizTypes';
import type { PostMetrics } from './campaign-types';

/** One verified post as its supplier (KOL / MCN) sees it. */
export interface PortfolioPost {
  bookingId: string;
  contentId: string;
  url: string;
  title: string;
  platform: Platform;
  /** KOL who made the post (MCN: the KOL behind the MCN channel). */
  kolAccountId: string;
  kolId: string;
  kolName: string;
  channelHandle?: string;
  campaignId: string;
  campaignName: string;
  brandCompany: string;
  verifiedAt: number;
  metrics: PostMetrics;
  /** "Hiện trên hồ sơ" (default true). */
  visible: boolean;
  /** Rating the brand gave this booking, if any. */
  brandRating?: { stars: number; comment: string };
}

/** A shown post on the brand-facing KOL profile (public data only). */
export interface PublicPost {
  id: string;
  url: string;
  title: string;
  platform: Platform;
  channelHandle?: string;
  brandCompany: string;
  verifiedAt: number;
  metrics: PostMetrics;
}
