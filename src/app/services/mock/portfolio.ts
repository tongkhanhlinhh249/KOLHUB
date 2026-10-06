// Mock "Bài đã đăng" service: the signed-in KOL / MCN lists its verified posts and hides / shows each one on its
// public profile; a Brand lists the shown posts of a KOL (KOL ID) on the KOL profile.
import type { Booking, ContentSubmission } from '../campaign-types';
import type { PortfolioPost, PublicPost, SupplierRatingRow } from '../portfolio-types';
import { KolhubError } from '../types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { currentBizAccount } from './bizSession';
import { currentSupplier, itemView } from './campaignRules';

export interface PortfolioServiceDeps {
  db: Db;
  now: () => number;
  delay?: false;
}

/** A verified post (kind POST, verified, with metrics) of a booking that was not cancelled. */
export function isVerifiedPost(c: ContentSubmission, b: Pick<Booking, 'status'>): boolean {
  return c.kind === 'POST' && !!c.verifiedAt && !!c.metrics && b.status !== 'CANCELLED';
}

/** Shown to brands: a verified post the supplier did not hide ("Hiện trên hồ sơ", default on). */
export function isShownOnProfile(c: ContentSubmission, b: Pick<Booking, 'status'>): boolean {
  return isVerifiedPost(c, b) && !c.hiddenOnProfile;
}

function company(state: DemoState, accountId: string): string {
  return state.accounts.find((a) => a.id === accountId)?.company ?? 'Nhãn hàng';
}

export function createPortfolioService(deps: PortfolioServiceDeps) {
  const { db, now } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());

  /** Verified posts of the signed-in KOL / MCN, newest first (4806 when the profile is not approved). */
  async function listMine(): Promise<PortfolioPost[]> {
    await wait();
    const state = db.read();
    const me = currentSupplier(state);
    const t = now();
    const out: PortfolioPost[] = [];
    for (const b of state.bookings) {
      if (b.supplierAccountId !== me.accountId) continue;
      const c = state.campaigns.find((x) => x.id === b.campaignId);
      for (const content of b.contents) {
        if (!isVerifiedPost(content, b)) continue;
        const it = b.items.find((i) => i.id === content.itemId) ?? b.items[0];
        if (!it) continue;
        const v = itemView(state, it, t);
        out.push({
          bookingId: b.id,
          contentId: content.id,
          url: content.url ?? '',
          title: content.title,
          platform: v.channel?.platform ?? it.platform,
          kolAccountId: it.kolAccountId,
          kolId: it.kolId,
          kolName: v.displayName,
          ...(v.channel ? { channelHandle: v.channel.handle } : {}),
          campaignId: b.campaignId,
          campaignName: c?.name ?? '',
          brandCompany: company(state, b.brandAccountId),
          verifiedAt: content.verifiedAt!,
          metrics: { ...content.metrics! },
          visible: !content.hiddenOnProfile,
          ...(b.ratings?.brand ? { brandRating: { stars: b.ratings.brand.stars, comment: b.ratings.brand.comment } } : {}),
        });
      }
    }
    return out.sort((a, b) => b.verifiedAt - a.verifiedAt);
  }

  /** "Hiện trên hồ sơ" on / off for one of the supplier's verified posts (4804 when not found / not theirs). */
  async function setVisible(bookingId: string, contentId: string, visible: boolean): Promise<void> {
    await wait();
    const state = db.read();
    const me = currentSupplier(state);
    const b = state.bookings.find((x) => x.id === bookingId && x.supplierAccountId === me.accountId);
    const c = b?.contents.find((x) => x.id === contentId);
    if (!b || !c || !isVerifiedPost(c, b)) throw new KolhubError('KOLHUB-4804');
    db.update((s) => {
      const x = s.bookings.find((y) => y.id === bookingId)!.contents.find((y) => y.id === contentId)!;
      if (visible) delete x.hiddenOnProfile;
      else x.hiddenOnProfile = true;
    });
  }

  /** Brand view: shown posts of a KOL (by KOL ID) from every supplier booking it worked on, newest first. */
  async function listPublic(kolId: string): Promise<PublicPost[]> {
    await wait();
    const state = db.read();
    currentBizAccount(state);
    const out: PublicPost[] = [];
    for (const b of state.bookings) {
      for (const content of b.contents) {
        if (!isShownOnProfile(content, b)) continue;
        const it = b.items.find((i) => i.id === content.itemId) ?? b.items[0];
        if (it?.kolId !== kolId) continue;
        const ch = it.channelId ? state.channels.find((x) => x.id === it.channelId) : undefined;
        out.push({
          id: content.id,
          url: content.url ?? '',
          title: content.title,
          platform: ch?.platform ?? it.platform,
          ...(ch ? { channelHandle: ch.handle } : {}),
          brandCompany: company(state, b.brandAccountId),
          verifiedAt: content.verifiedAt!,
          metrics: { ...content.metrics! },
        });
      }
    }
    return out.sort((a, b) => b.verifiedAt - a.verifiedAt);
  }

  /**
   * "Đánh giá": completed bookings of the signed-in KOL / MCN with both ratings (the brand's rating of the supplier is
   * already shown to it on "Nội dung"), newest first (4806 when the profile is not approved).
   */
  async function listRatings(): Promise<SupplierRatingRow[]> {
    await wait();
    const state = db.read();
    const me = currentSupplier(state);
    const t = now();
    const out: SupplierRatingRow[] = [];
    for (const b of state.bookings) {
      if (b.supplierAccountId !== me.accountId || b.status !== 'COMPLETED') continue;
      const c = state.campaigns.find((x) => x.id === b.campaignId);
      const kolNames = [...new Set(b.items.map((it) => itemView(state, it, t).displayName))];
      out.push({
        bookingId: b.id,
        campaignId: b.campaignId,
        campaignName: c?.name ?? '',
        brandCompany: company(state, b.brandAccountId),
        kolNames,
        completedAt: b.completedAt ?? b.updatedAt,
        ...(b.ratings?.brand ? { received: { ...b.ratings.brand } } : {}),
        ...(b.ratings?.supplier ? { given: { ...b.ratings.supplier } } : {}),
      });
    }
    return out.sort((a, b) => b.completedAt - a.completedAt);
  }

  return { listMine, setVisible, listPublic, listRatings };
}

export type PortfolioService = ReturnType<typeof createPortfolioService>;
