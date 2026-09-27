// MCN ↔ KOL management: invitations, management links and assignment of MCN channels to linked KOLs.
import { KOL_CATEGORIES, KOL_REGIONS, type KolCategory, type KolRegion } from '../bizTypes';
import type { CurrentMcn, McnKolLink, McnKolRow, McnSummary } from '../mcn-kol-types';
import type { Channel, KolProfile, McnProfile } from '../profile-types';
import { KolhubError } from '../types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { isSearchableChannel } from './directory';
import { profileDisplayName } from './identity';
import { normalizeEmail } from './normalize';

export interface McnKolServiceDeps {
  db: Db;
  now: () => number;
  /** Pass false in tests to skip the fake network latency. */
  delay?: false;
  genId?: () => string;
}

const KOL_ID_RE = /^kol-\d{4}-\d{4}$/i;

function approvedMcn(state: DemoState, mcnAccountId: string): McnProfile | undefined {
  return state.mcnProfiles.find((p) => p.accountId === mcnAccountId && p.status === 'APPROVED');
}

function approvedKol(state: DemoState, kolAccountId: string): KolProfile | undefined {
  return state.kolProfiles.find((p) => p.accountId === kolAccountId && p.status === 'APPROVED' && !!p.kolId);
}

/** KOL ID (any case) or login email of a KOL account → the approved KOL profile. */
function findInvitee(state: DemoState, raw: string): KolProfile | undefined {
  const q = (raw ?? '').trim();
  if (KOL_ID_RE.test(q)) {
    const id = q.toUpperCase();
    return state.kolProfiles.find((p) => p.kolId === id && p.status === 'APPROVED');
  }
  const email = normalizeEmail(q);
  const acc = state.accounts.find((a) => a.type === 'KOL' && normalizeEmail(a.email) === email);
  return acc ? approvedKol(state, acc.id) : undefined;
}

const activeLinkOf = (state: DemoState, kolAccountId: string) =>
  state.mcnKolLinks.find((l) => l.kolAccountId === kolAccountId && l.status === 'ACTIVE');

const assignedCount = (channels: Channel[], mcnAccountId: string, kolAccountId: string) =>
  channels.filter((c) => c.ownerId === mcnAccountId && c.ownerType === 'MCN' && c.assignedKolAccountId === kolAccountId).length;

/** Unassign every channel of `mcnAccountId` held by `kolAccountId` (on end / leave). */
function unassignAll(state: DemoState, mcnAccountId: string, kolAccountId: string, t: number) {
  for (const c of state.channels) {
    if (c.ownerId === mcnAccountId && c.assignedKolAccountId === kolAccountId) {
      delete c.assignedKolAccountId;
      c.updatedAt = t;
    }
  }
}

function toRow(state: DemoState, link: McnKolLink, now: number): McnKolRow | null {
  const p = state.kolProfiles.find((x) => x.accountId === link.kolAccountId);
  if (!p || !p.kolId) return null;
  const own = state.channels.filter((c) => c.ownerId === p.accountId && c.ownerType === 'KOL');
  const category = (KOL_CATEGORIES as readonly string[]).includes(p.contact.category) ? (p.contact.category as KolCategory) : undefined;
  const region = (KOL_REGIONS as readonly string[]).includes(p.contact.province) ? (p.contact.province as KolRegion) : undefined;
  const row: McnKolRow = {
    linkId: link.id,
    kolAccountId: link.kolAccountId,
    kolId: p.kolId,
    displayName: profileDisplayName(p) || p.kolId,
    totalFollowers: own.filter((c) => isSearchableChannel(c, now)).reduce((n, c) => n + (c.stats?.followers ?? 0), 0),
    assignedChannelCount: link.status === 'ACTIVE' ? assignedCount(state.channels, link.mcnAccountId, link.kolAccountId) : 0,
    status: link.status,
    invitedAt: link.invitedAt,
  };
  if (p.avatar?.thumbnail) row.avatar = p.avatar.thumbnail;
  if (category) row.category = category;
  if (region) row.region = region;
  const fields = p.contact.fields?.length ? p.contact.fields : category ? [{ name: category, medal: 'none' as const }] : [];
  if (fields.length) row.fields = fields.slice(0, 3).map((f) => ({ name: f.name, medal: f.medal }));
  if (link.respondedAt !== undefined) row.respondedAt = link.respondedAt;
  if (link.endedAt !== undefined) row.endedAt = link.endedAt;
  if (link.endedBy) row.endedBy = link.endedBy;
  return row;
}

function toSummary(state: DemoState, link: McnKolLink): McnSummary {
  const p = state.mcnProfiles.find((x) => x.accountId === link.mcnAccountId);
  const out: McnSummary = {
    linkId: link.id,
    mcnAccountId: link.mcnAccountId,
    name: (p && profileDisplayName(p)) || 'MCN',
    invitedAt: link.invitedAt,
  };
  if (p?.mcnId) out.mcnId = p.mcnId;
  if (p?.avatar?.thumbnail) out.avatar = p.avatar.thumbnail;
  if (p?.contact.province) out.province = p.contact.province;
  return out;
}

function toCurrent(state: DemoState, link: McnKolLink): CurrentMcn {
  return {
    ...toSummary(state, link),
    since: link.respondedAt ?? link.invitedAt,
    assignedChannelCount: assignedCount(state.channels, link.mcnAccountId, link.kolAccountId),
  };
}

/** Mock MCN ↔ KOL service. MCN side takes the MCN account id, KOL side the KOL account id. */
export function createMcnKolService(deps: McnKolServiceDeps) {
  const { db, now } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());
  const newId = () => deps.genId?.() ?? `mk-${crypto.randomUUID()}`;

  /** Link of `status` owned by the given side, else 4707. */
  function ownLink(state: DemoState, linkId: string, side: { mcn?: string; kol?: string }, status: McnKolLink['status']): McnKolLink {
    const l = state.mcnKolLinks.find((x) => x.id === linkId);
    if (!l || l.status !== status) throw new KolhubError('KOLHUB-4707');
    if (side.mcn !== undefined && l.mcnAccountId !== side.mcn) throw new KolhubError('KOLHUB-4707');
    if (side.kol !== undefined && l.kolAccountId !== side.kol) throw new KolhubError('KOLHUB-4707');
    return l;
  }

  // ----- MCN side -----

  /** Latest link per KOL of this MCN, newest invite first. */
  async function listKols(mcnAccountId: string): Promise<McnKolRow[]> {
    await wait();
    const state = db.read();
    const t = now();
    const latest = new Map<string, McnKolLink>();
    for (const l of state.mcnKolLinks) {
      if (l.mcnAccountId !== mcnAccountId) continue;
      const prev = latest.get(l.kolAccountId);
      if (!prev || l.invitedAt >= prev.invitedAt) latest.set(l.kolAccountId, l);
    }
    return [...latest.values()]
      .sort((a, b) => b.invitedAt - a.invitedAt)
      .map((l) => toRow(state, l, t))
      .filter((r): r is McnKolRow => r !== null);
  }

  /** Invite an approved KOL by KOL ID or login email (4701–4706). */
  async function invite(mcnAccountId: string, target: string): Promise<McnKolRow> {
    await wait();
    const state = db.read();
    if (!approvedMcn(state, mcnAccountId)) throw new KolhubError('KOLHUB-4701');
    if (!(target ?? '').trim()) throw new KolhubError('KOLHUB-4702', { field: 'target' });
    const kol = findInvitee(state, target);
    if (!kol) throw new KolhubError('KOLHUB-4703', { field: 'target' });
    const mine = state.mcnKolLinks.filter((l) => l.mcnAccountId === mcnAccountId && l.kolAccountId === kol.accountId);
    if (mine.some((l) => l.status === 'PENDING')) throw new KolhubError('KOLHUB-4704', { field: 'target' });
    if (mine.some((l) => l.status === 'ACTIVE')) throw new KolhubError('KOLHUB-4705', { field: 'target' });
    if (activeLinkOf(state, kol.accountId)) throw new KolhubError('KOLHUB-4706', { field: 'target' });

    const link: McnKolLink = { id: newId(), mcnAccountId, kolAccountId: kol.accountId, status: 'PENDING', invitedAt: now() };
    db.update((s) => {
      s.mcnKolLinks.push(link);
    });
    return toRow(db.read(), link, now())!;
  }

  /** Withdraw a PENDING invite: the record is removed (the relation never started). */
  async function cancelInvite(mcnAccountId: string, linkId: string): Promise<void> {
    await wait();
    ownLink(db.read(), linkId, { mcn: mcnAccountId }, 'PENDING');
    db.update((s) => {
      s.mcnKolLinks = s.mcnKolLinks.filter((l) => l.id !== linkId);
    });
  }

  /** End an ACTIVE link; the KOL's assigned MCN channels become "Kênh riêng MCN" again. */
  async function endLink(mcnAccountId: string, linkId: string): Promise<void> {
    await wait();
    const l = ownLink(db.read(), linkId, { mcn: mcnAccountId }, 'ACTIVE');
    const t = now();
    db.update((s) => {
      const x = s.mcnKolLinks.find((y) => y.id === linkId)!;
      x.status = 'ENDED';
      x.endedAt = t;
      x.endedBy = 'MCN';
      unassignAll(s, l.mcnAccountId, l.kolAccountId, t);
    });
  }

  /** Assign an MCN channel to an ACTIVE linked KOL, or back to the MCN itself (`null`). */
  async function assignChannel(mcnAccountId: string, channelId: string, kolAccountId: string | null): Promise<Channel> {
    await wait();
    const state = db.read();
    const ch = state.channels.find((c) => c.id === channelId);
    if (!ch || ch.ownerId !== mcnAccountId || ch.ownerType !== 'MCN') throw new KolhubError('KOLHUB-4710');
    if (kolAccountId !== null) {
      const ok = state.mcnKolLinks.some(
        (l) => l.mcnAccountId === mcnAccountId && l.kolAccountId === kolAccountId && l.status === 'ACTIVE',
      );
      if (!ok) throw new KolhubError('KOLHUB-4709');
    }
    const t = now();
    let out!: Channel;
    db.update((s) => {
      const c = s.channels.find((x) => x.id === channelId)!;
      if (kolAccountId === null) delete c.assignedKolAccountId;
      else c.assignedKolAccountId = kolAccountId;
      c.updatedAt = t;
      out = structuredClone(c);
    });
    return out;
  }

  // ----- KOL side -----

  /** PENDING invites addressed to this KOL, newest first. */
  async function listInvites(kolAccountId: string): Promise<McnSummary[]> {
    await wait();
    const state = db.read();
    return state.mcnKolLinks
      .filter((l) => l.kolAccountId === kolAccountId && l.status === 'PENDING')
      .sort((a, b) => b.invitedAt - a.invitedAt)
      .map((l) => toSummary(state, l));
  }

  async function currentMcn(kolAccountId: string): Promise<CurrentMcn | null> {
    await wait();
    const state = db.read();
    const l = activeLinkOf(state, kolAccountId);
    return l ? toCurrent(state, l) : null;
  }

  /** Accept an invite (4708 when already managed); other PENDING invites are declined automatically. */
  async function accept(kolAccountId: string, linkId: string): Promise<CurrentMcn> {
    await wait();
    const state = db.read();
    ownLink(state, linkId, { kol: kolAccountId }, 'PENDING');
    if (activeLinkOf(state, kolAccountId)) throw new KolhubError('KOLHUB-4708');
    const t = now();
    db.update((s) => {
      for (const l of s.mcnKolLinks) {
        if (l.kolAccountId !== kolAccountId || l.status !== 'PENDING') continue;
        l.status = l.id === linkId ? 'ACTIVE' : 'DECLINED';
        l.respondedAt = t;
      }
    });
    const next = db.read();
    return toCurrent(next, next.mcnKolLinks.find((l) => l.id === linkId)!);
  }

  async function decline(kolAccountId: string, linkId: string): Promise<void> {
    await wait();
    ownLink(db.read(), linkId, { kol: kolAccountId }, 'PENDING');
    const t = now();
    db.update((s) => {
      const l = s.mcnKolLinks.find((x) => x.id === linkId)!;
      l.status = 'DECLINED';
      l.respondedAt = t;
    });
  }

  /** KOL leaves its MCN; assigned MCN channels return to the MCN. */
  async function leave(kolAccountId: string, linkId: string): Promise<void> {
    await wait();
    const l = ownLink(db.read(), linkId, { kol: kolAccountId }, 'ACTIVE');
    const t = now();
    db.update((s) => {
      const x = s.mcnKolLinks.find((y) => y.id === linkId)!;
      x.status = 'ENDED';
      x.endedAt = t;
      x.endedBy = 'KOL';
      unassignAll(s, l.mcnAccountId, l.kolAccountId, t);
    });
  }

  return { listKols, invite, cancelInvite, endLink, assignChannel, listInvites, currentMcn, accept, decline, leave };
}

export type McnKolService = ReturnType<typeof createMcnKolService>;
