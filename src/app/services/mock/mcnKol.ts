// MCN → KOL channel assignment. The only relation is `Channel.assignedKolAccountId` on MCN-owned channels.
import { KOL_CATEGORIES, KOL_REGIONS, type KolCategory, type KolRegion } from '../bizTypes';
import type { ChannelAssignment, KolPickItem, McnKolRow } from '../mcn-kol-types';
import type { Channel, KolProfile } from '../profile-types';
import { KolhubError } from '../types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { isSearchableChannel, normalizeText } from './directory';
import { profileDisplayName } from './identity';
import { normalizeEmail } from './normalize';

export interface McnKolServiceDeps {
  db: Db;
  now: () => number;
  /** Pass false in tests to skip the fake network latency. */
  delay?: false;
  genId?: () => string;
}

/** Results of the KOL picker. */
export const KOL_PICK_LIMIT = 20;

const isApprovedKol = (p: KolProfile) => p.status === 'APPROVED' && !!p.kolId;

function pickItem(state: DemoState, p: KolProfile, now: number): KolPickItem {
  const own = state.channels.filter((c) => c.ownerId === p.accountId && c.ownerType === 'KOL');
  const category = (KOL_CATEGORIES as readonly string[]).includes(p.contact.category) ? (p.contact.category as KolCategory) : undefined;
  const region = (KOL_REGIONS as readonly string[]).includes(p.contact.province) ? (p.contact.province as KolRegion) : undefined;
  const item: KolPickItem = {
    kolAccountId: p.accountId,
    kolId: p.kolId!,
    displayName: profileDisplayName(p) || p.kolId!,
    totalFollowers: own.filter((c) => isSearchableChannel(c, now)).reduce((n, c) => n + (c.stats?.followers ?? 0), 0),
  };
  if (p.avatar?.thumbnail) item.avatar = p.avatar.thumbnail;
  if (category) item.category = category;
  if (region) item.region = region;
  return item;
}

function toRow(state: DemoState, p: KolProfile, assigned: Channel[], now: number): McnKolRow {
  const base = pickItem(state, p, now);
  const src = p.contact.fields?.length ? p.contact.fields : base.category ? [{ name: base.category, medal: 'none' as const }] : [];
  const times = assigned.map((c) => c.assignedAt).filter((t): t is number => t !== undefined);
  const row: McnKolRow = {
    ...base,
    assignedChannelCount: assigned.length,
    channels: assigned.map((c) => ({ id: c.id, platform: c.platform, handle: c.handle, url: c.url })),
  };
  if (src.length) row.fields = src.slice(0, 3).map((f) => ({ name: f.name, medal: f.medal }));
  if (times.length) row.lastAssignedAt = Math.max(...times);
  return row;
}

/** Mock MCN → KOL assignment service (MCN side; KOLs see nothing). */
export function createMcnKolService(deps: McnKolServiceDeps) {
  const { db, now } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());

  /** The MCN's own channels for `ids` (4704 when empty, 4703 when any is missing or not the MCN's). */
  function ownChannels(state: DemoState, mcnAccountId: string, ids: string[]): Set<string> {
    const set = new Set(ids);
    if (set.size === 0) throw new KolhubError('KOLHUB-4704');
    for (const id of set) {
      const c = state.channels.find((x) => x.id === id);
      if (!c || c.ownerId !== mcnAccountId || c.ownerType !== 'MCN') throw new KolhubError('KOLHUB-4703');
    }
    return set;
  }

  /** KOLs holding ≥ 1 channel of this MCN, most recently assigned first. */
  async function listKols(mcnAccountId: string): Promise<McnKolRow[]> {
    await wait();
    const state = db.read();
    const t = now();
    const byKol = new Map<string, Channel[]>();
    for (const c of state.channels) {
      if (c.ownerId !== mcnAccountId || c.ownerType !== 'MCN' || !c.assignedKolAccountId) continue;
      byKol.set(c.assignedKolAccountId, [...(byKol.get(c.assignedKolAccountId) ?? []), c]);
    }
    const rows: McnKolRow[] = [];
    for (const [kolAccountId, chans] of byKol) {
      const p = state.kolProfiles.find((x) => x.accountId === kolAccountId);
      if (p?.kolId) rows.push(toRow(state, p, chans, t));
    }
    return rows.sort((a, b) => (b.lastAssignedAt ?? 0) - (a.lastAssignedAt ?? 0) || a.displayName.localeCompare(b.displayName, 'vi'));
  }

  /** Approved KOLs matching name / KOL ID / login email (accent- and case-insensitive), A → Z, max 20. */
  async function searchKols(query: string): Promise<KolPickItem[]> {
    await wait();
    const state = db.read();
    const t = now();
    const kw = normalizeText(query ?? '');
    const email = normalizeEmail(query ?? '');
    const emailOf = (id: string) => normalizeEmail(state.accounts.find((a) => a.id === id)?.email ?? '');
    return state.kolProfiles
      .filter(isApprovedKol)
      .filter(
        (p) =>
          !kw ||
          normalizeText(profileDisplayName(p)).includes(kw) ||
          normalizeText(p.kolId!).includes(kw) ||
          (email.includes('@') && emailOf(p.accountId) === email),
      )
      .map((p) => pickItem(state, p, t))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'))
      .slice(0, KOL_PICK_LIMIT);
  }

  /**
   * Assign channels of an approved MCN to one approved KOL (4701–4704). Channels held by another KOL move;
   * channels already held by this KOL are left untouched. All-or-nothing.
   */
  async function assignChannels(mcnAccountId: string, channelIds: string[], kolAccountId: string): Promise<{ assigned: number }> {
    await wait();
    const state = db.read();
    const ids = ownChannels(state, mcnAccountId, channelIds);
    if (!state.mcnProfiles.some((p) => p.accountId === mcnAccountId && p.status === 'APPROVED')) throw new KolhubError('KOLHUB-4701');
    const kol = state.kolProfiles.find((p) => p.accountId === kolAccountId);
    if (!kol || !isApprovedKol(kol)) throw new KolhubError('KOLHUB-4702');
    const t = now();
    let assigned = 0;
    db.update((s) => {
      for (const c of s.channels) {
        if (!ids.has(c.id) || c.assignedKolAccountId === kolAccountId) continue;
        c.assignedKolAccountId = kolAccountId;
        c.assignedAt = t;
        c.updatedAt = t;
        assigned++;
      }
    });
    return { assigned };
  }

  /** Back to "Kênh riêng MCN". Returns the previous owners (only channels that had one) for undo. */
  async function unassignChannels(mcnAccountId: string, channelIds: string[]): Promise<ChannelAssignment[]> {
    await wait();
    const ids = ownChannels(db.read(), mcnAccountId, channelIds);
    const t = now();
    const prev: ChannelAssignment[] = [];
    db.update((s) => {
      for (const c of s.channels) {
        if (!ids.has(c.id) || !c.assignedKolAccountId) continue;
        prev.push({ channelId: c.id, kolAccountId: c.assignedKolAccountId });
        delete c.assignedKolAccountId;
        delete c.assignedAt;
        c.updatedAt = t;
      }
    });
    return prev;
  }

  return { listKols, searchKols, assignChannels, unassignChannels };
}

export type McnKolService = ReturnType<typeof createMcnKolService>;
