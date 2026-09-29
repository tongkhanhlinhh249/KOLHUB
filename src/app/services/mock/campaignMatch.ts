// "Phù hợp với bạn" (Sàn v2): how well a marketplace campaign fits the signed-in supplier.
// `matchCampaign` is pure; `supplierMatchContext` reads the supplier's channels / KOL fields from the state.
import { PLATFORMS, type Platform } from '../bizTypes';
import { DELIVERABLE_TYPES, type Campaign, type CampaignMatch, type SupplierMatchContext } from '../campaign-types';
import type { KolProfile } from '../profile-types';
import type { DemoState } from './db';
import { isSearchableChannel, normalizeText } from './directory';

/**
 * Weights (sum 100):
 * - platform: share of the campaign's platforms where the supplier has ≥ 1 eligible channel;
 * - category: campaign categories covered by the KOLs behind those channels (2 matches = full; none required = full);
 * - quantity: requested units the supplier can take on, each channel taking at most CHANNEL_CAPACITY units per line;
 * - budget: budget per follower of the relevant channels within BUDGET_PER_FOLLOWER (a rough sanity check).
 */
export const MATCH_WEIGHTS = { platform: 40, category: 30, quantity: 15, budget: 15 } as const;
/** Units of one deliverable line one channel can reasonably deliver in a campaign. */
export const CHANNEL_CAPACITY = 3;
/** VND of campaign budget per follower of the supplier's relevant channels considered "in scale". */
export const BUDGET_PER_FOLLOWER = { min: 10, max: 300 } as const;
/** Budget points when out of scale: budget too low for the audience / audience too small for the budget. */
const BUDGET_LOW_PTS = 5;
const BUDGET_SMALL_AUDIENCE_PTS = 8;
/** Categories needed for full category points (or all of them when the campaign lists fewer). */
const CATEGORY_TARGET = 2;

const platformLabel = (p: Platform) => PLATFORMS.find((x) => x.key === p)?.label ?? p;
const typeLabel = (t: string) => DELIVERABLE_TYPES.find((d) => d.key === t)?.label ?? t;

export function matchCampaign(campaign: Pick<Campaign, 'platforms' | 'categories' | 'deliverables' | 'budget'>, ctx: SupplierMatchContext): CampaignMatch {
  const reasons: string[] = [];
  const missing: string[] = [];
  const relevant = ctx.channels.filter((c) => campaign.platforms.includes(c.platform));
  const onPlatform = (p: Platform) => relevant.filter((c) => c.platform === p);

  // Category / activity fields of the KOLs that can deliver on the campaign's platforms.
  let categoryPts: number = MATCH_WEIGHTS.category;
  if (campaign.categories.length === 0) {
    reasons.push('Không giới hạn lĩnh vực');
  } else {
    const have = new Set(relevant.flatMap((c) => c.categories.map(normalizeText)));
    const matched = campaign.categories.filter((c) => have.has(normalizeText(c)));
    const need = Math.min(CATEGORY_TARGET, campaign.categories.length);
    categoryPts = (MATCH_WEIGHTS.category * Math.min(matched.length, need)) / need;
    if (matched.length) reasons.push(`Khớp lĩnh vực ${matched.join(', ')}`);
    else
      missing.push(
        ctx.type === 'MCN'
          ? `Chưa có KOL thuộc lĩnh vực ${campaign.categories.join(', ')}`
          : `Lĩnh vực của bạn chưa thuộc ${campaign.categories.join(', ')}`,
      );
  }

  // Platforms.
  let covered = 0;
  for (const p of campaign.platforms) {
    const n = onPlatform(p).length;
    if (n > 0) {
      covered++;
      reasons.push(`Có ${n} kênh ${platformLabel(p)} đã xác thực`);
    } else if (ctx.unassignedPlatforms?.includes(p)) {
      missing.push(`Kênh ${platformLabel(p)} của bạn chưa được giao cho KOL nào`);
    } else {
      missing.push(`Chưa có kênh ${platformLabel(p)} đã xác thực`);
    }
  }
  const platformPts = campaign.platforms.length ? (MATCH_WEIGHTS.platform * covered) / campaign.platforms.length : MATCH_WEIGHTS.platform;

  // Deliverable quantity.
  let total = 0;
  let feasible = 0;
  for (const d of campaign.deliverables) {
    const n = onPlatform(d.platform).length;
    total += d.quantity;
    feasible += Math.min(d.quantity, n * CHANNEL_CAPACITY);
    if (n > 0 && n * CHANNEL_CAPACITY < d.quantity) {
      missing.push(`Cần ${d.quantity} ${typeLabel(d.type)} ${platformLabel(d.platform)}, bạn có ${n} kênh`);
    }
  }
  const quantityPts = total ? (MATCH_WEIGHTS.quantity * feasible) / total : MATCH_WEIGHTS.quantity;
  if (total > 0 && feasible === total) reasons.push('Đáp ứng đủ số lượng hạng mục');

  // Budget vs audience.
  const audience = relevant.reduce((n, c) => n + c.followers, 0);
  let budgetPts = 0;
  if (audience > 0) {
    const perFollower = campaign.budget / audience;
    if (perFollower < BUDGET_PER_FOLLOWER.min) {
      budgetPts = BUDGET_LOW_PTS;
      missing.push('Ngân sách thấp so với quy mô kênh của bạn');
    } else if (perFollower > BUDGET_PER_FOLLOWER.max) {
      budgetPts = BUDGET_SMALL_AUDIENCE_PTS;
      missing.push('Quy mô kênh nhỏ so với ngân sách chiến dịch');
    } else {
      budgetPts = MATCH_WEIGHTS.budget;
      reasons.push('Quy mô kênh phù hợp với ngân sách');
    }
  }

  // Nothing to deliver with: no points at all, whatever the category rule says.
  const score = relevant.length === 0 ? 0 : Math.round(platformPts + categoryPts + quantityPts + budgetPts);
  if (relevant.length === 0) {
    const i = reasons.indexOf('Không giới hạn lĩnh vực');
    if (i >= 0) reasons.splice(i, 1);
  }
  return { score: Math.max(0, Math.min(100, score)), reasons, missing };
}

function kolCategories(p: KolProfile | undefined): string[] {
  if (!p) return [];
  const fields = p.contact.fields?.map((f) => f.name).filter(Boolean) ?? [];
  if (fields.length) return fields;
  return p.contact.category ? [p.contact.category] : [];
}

/**
 * Channels the account could put in a proposal (spec §6): verified badge + active; MCN: its channels assigned
 * to an approved KOL (with that KOL's fields); KOL: its own channels (with its own fields). Other accounts → empty.
 */
export function supplierMatchContext(state: DemoState, accountId: string, now: number): SupplierMatchContext {
  const acc = state.accounts.find((a) => a.id === accountId);
  const followers = (c: { stats?: { followers: number } }) => c.stats?.followers ?? 0;
  if (acc?.type === 'MCN') {
    const own = state.channels.filter((c) => c.ownerType === 'MCN' && c.ownerId === accountId && isSearchableChannel(c, now));
    const channels: SupplierMatchContext['channels'] = [];
    const unassigned = new Set<Platform>();
    for (const c of own) {
      const kol = c.assignedKolAccountId ? state.kolProfiles.find((p) => p.accountId === c.assignedKolAccountId) : undefined;
      if (!kol) {
        if (!c.assignedKolAccountId) unassigned.add(c.platform);
        continue;
      }
      if (kol.status !== 'APPROVED' || !kol.kolId) continue;
      channels.push({ id: c.id, platform: c.platform, followers: followers(c), kolAccountId: kol.accountId, categories: kolCategories(kol) });
    }
    const ctx: SupplierMatchContext = { type: 'MCN', channels };
    const onlyUnassigned = [...unassigned].filter((p) => !channels.some((c) => c.platform === p));
    if (onlyUnassigned.length) ctx.unassignedPlatforms = onlyUnassigned;
    return ctx;
  }
  if (acc?.type === 'KOL') {
    const categories = kolCategories(state.kolProfiles.find((p) => p.accountId === accountId));
    return {
      type: 'KOL',
      channels: state.channels
        .filter((c) => c.ownerType === 'KOL' && c.ownerId === accountId && isSearchableChannel(c, now))
        .map((c) => ({ id: c.id, platform: c.platform, followers: followers(c), kolAccountId: accountId, categories: [...categories] })),
    };
  }
  return { type: 'KOL', channels: [] };
}
