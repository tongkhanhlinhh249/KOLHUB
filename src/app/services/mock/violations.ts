// Mock violations ("Danh sách vi phạm"): Admin review, owner fix / appeal, read-only Brand view.
import { KolhubError } from '../types';
import type { KolProfile } from '../profile-types';
import type { SafetyMonitor } from '../safety-types';
import {
  APPEAL_MIN,
  REPORT_NOTE_MAX,
  REPORT_NOTE_MIN,
  VIOLATION_CATEGORIES,
  type BrandReportInput,
  type BrandViolation,
  type OwnerViolation,
  type Violation,
  type ViolationAction,
  type ViolationActor,
  type ViolationAdminQueue,
  type ViolationCategory,
  type ViolationStatus,
} from '../violation-types';
import type { DemoState, Db } from './db';
import { delay as fakeDelay } from './delay';
import { currentBizAccount } from './bizSession';
import { channelHandle as handleOfUrl, detectPlatform, normalizeChannelUrl } from './channelRules';

export interface ViolationServiceDeps {
  db: Db;
  now: () => number;
  delay?: false;
}

const byNewest = (a: Violation, b: Violation) => b.detectedAt - a.detectedAt || (a.id < b.id ? -1 : 1);

/** Steps a Brand may see on the timeline. */
const PUBLIC_ACTIONS: ViolationAction[] = ['DETECTED', 'REPORTED', 'CONFIRMED', 'RESOLVED'];

function approvedKol(state: DemoState, v: Violation): KolProfile | undefined {
  if (v.ownerType !== 'KOL' || !v.kolId) return undefined;
  return state.kolProfiles.find((p) => p.accountId === v.ownerId && p.kolId === v.kolId && p.status === 'APPROVED');
}

/** Brand projection, built field by field (BR-58 exception: confirmed violations only, no notes). */
function toBrand(state: DemoState, v: Violation): BrandViolation | null {
  if (v.status !== 'CONFIRMED' && v.status !== 'RESOLVED') return null;
  const p = approvedKol(state, v);
  if (!p || !p.kolId) return null;
  const out: BrandViolation = {
    id: v.id,
    kolId: p.kolId,
    kolName: p.contact.displayName,
    platform: v.platform,
    channelHandle: v.channelHandle,
    channelUrl: v.channelUrl,
    contentTitle: v.contentTitle,
    category: v.category,
    severity: v.severity,
    source: v.source,
    detectedAt: v.detectedAt,
    status: v.status,
    history: v.history.filter((e) => PUBLIC_ACTIONS.includes(e.action)).map((e) => ({ at: e.at, action: e.action })),
  };
  if (p.avatar?.thumbnail) out.kolAvatar = p.avatar.thumbnail;
  if (v.contentUrl) out.contentUrl = v.contentUrl;
  if (v.thumbnail) out.thumbnail = v.thumbnail;
  return out;
}

/** Owner projection: never carries the reporter's identity. */
function toOwner(v: Violation): OwnerViolation {
  const { reporter: _reporter, ...rest } = structuredClone(v);
  return rest;
}

/** Category of a scan issue title (KOL Safety wording → violation category). */
export function categoryOfIssue(title: string): ViolationCategory {
  const t = title.toLowerCase();
  if (t.includes('gắn nhãn') || t.includes('quảng cáo')) return 'Quảng cáo không gắn nhãn';
  if (t.includes('công dụng') || t.includes('sai sự thật')) return 'Thông tin sai sự thật';
  if (t.includes('thông tin cá nhân')) return 'Lộ thông tin cá nhân';
  if (t.includes('bản quyền')) return 'Vi phạm bản quyền';
  return 'Nội dung phản cảm';
}

/**
 * After a channel scan: one PENDING_REVIEW violation (source KOL_SAFETY) per VIOLATION video of the
 * monitor, unless one already exists for that video. Mutates `state`; returns the new violations.
 */
export function syncViolationsFromMonitor(state: DemoState, monitor: SafetyMonitor, t: number): Violation[] {
  const account = state.accounts.find((a) => a.id === monitor.accountId);
  if (!account || (account.type !== 'KOL' && account.type !== 'MCN')) return [];
  state.violations ??= [];
  const known = new Set(state.violations.map((v) => v.scanVideoId).filter(Boolean));
  const kolId =
    account.type === 'KOL' ? state.kolProfiles.find((p) => p.accountId === account.id && p.status === 'APPROVED')?.kolId : undefined;
  const added: Violation[] = [];
  for (const video of monitor.scannedVideos) {
    if (video.verdict !== 'VIOLATION' || known.has(video.id)) continue;
    const issue = video.issues.find((i) => i.severity === 'violation') ?? video.issues[0];
    const v: Violation = {
      id: `vio-ks-${video.id}`,
      ownerType: account.type,
      ownerId: account.id,
      platform: monitor.platform,
      channelHandle: monitor.handle,
      channelUrl: monitor.url,
      contentTitle: video.title,
      contentUrl: `https://${monitor.url}/video/${video.id}`,
      thumbnail: video.thumbnail,
      category: categoryOfIssue(issue?.title ?? ''),
      severity: video.score <= 10 ? 'high' : 'medium',
      source: 'KOL_SAFETY',
      scanVideoId: video.id,
      detectedAt: t,
      status: 'PENDING_REVIEW',
      history: [{ at: t, actor: 'system', action: 'DETECTED', note: issue?.title }],
      updatedAt: t,
    };
    if (kolId) v.kolId = kolId;
    state.violations.push(v);
    known.add(video.id);
    added.push(v);
  }
  return added;
}

/** Counts per status (for tabs and summary cards). */
export function countByStatus(list: Pick<Violation, 'status'>[]): Record<ViolationStatus | 'all', number> {
  const out: Record<ViolationStatus | 'all', number> = {
    all: list.length,
    PENDING_REVIEW: 0,
    CONFIRMED: 0,
    APPEALED: 0,
    RESOLVED: 0,
    DISMISSED: 0,
  };
  for (const v of list) out[v.status]++;
  return out;
}

export function createViolationService(deps: ViolationServiceDeps) {
  const { db, now } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());

  function find(s: DemoState, id: string): Violation {
    const v = (s.violations ?? []).find((x) => x.id === id);
    if (!v) throw new KolhubError('KOLHUB-4601');
    return v;
  }

  function transition(
    id: string,
    guard: (v: Violation) => void,
    apply: (v: Violation, t: number) => { actor: ViolationActor; action: ViolationAction; note?: string; status: ViolationStatus },
  ): Violation {
    const t = now();
    let out!: Violation;
    db.update((s) => {
      const v = find(s, id);
      guard(v);
      const step = apply(v, t);
      v.status = step.status;
      v.updatedAt = t;
      v.history.push({ at: t, actor: step.actor, action: step.action, ...(step.note ? { note: step.note } : {}) });
      out = structuredClone(v);
    });
    return out;
  }

  const requireStatus = (v: Violation, ...allowed: ViolationStatus[]) => {
    if (!allowed.includes(v.status)) throw new KolhubError('KOLHUB-4602');
  };
  const requireReason = (reason: string | undefined): string => {
    const r = (reason ?? '').trim();
    if (!r) throw new KolhubError('KOLHUB-4604', { field: 'reason' });
    return r;
  };
  const requireOwner = (v: Violation, accountId: string) => {
    if (v.ownerId !== accountId) throw new KolhubError('KOLHUB-4603');
  };

  // --- owner (KOL / MCN) ---

  /** Every violation of the owner account, newest first. */
  async function listForOwner(accountId: string): Promise<OwnerViolation[]> {
    await wait();
    return (db.read().violations ?? [])
      .filter((v) => v.ownerId === accountId)
      .sort(byNewest)
      .map(toOwner);
  }

  /** CONFIRMED → RESOLVED with the owner's note (content removed / fixed). */
  async function markResolved(accountId: string, id: string, note: string): Promise<OwnerViolation> {
    const n = (note ?? '').trim();
    await wait();
    return toOwner(transition(
      id,
      (v) => {
        requireOwner(v, accountId);
        requireStatus(v, 'CONFIRMED');
        if (!n) throw new KolhubError('KOLHUB-4607', { field: 'note' });
      },
      (v) => {
        v.ownerNote = n;
        return { actor: 'owner', action: 'RESOLVED', note: n, status: 'RESOLVED' };
      },
    ));
  }

  /** CONFIRMED → APPEALED, once per violation, reason ≥ 20 characters. */
  async function appeal(accountId: string, id: string, reason: string): Promise<OwnerViolation> {
    const r = (reason ?? '').trim();
    await wait();
    return toOwner(transition(
      id,
      (v) => {
        requireOwner(v, accountId);
        requireStatus(v, 'CONFIRMED');
        if (v.appealed) throw new KolhubError('KOLHUB-4606');
        if (r.length < APPEAL_MIN) throw new KolhubError('KOLHUB-4605', { field: 'reason' });
      },
      (v) => {
        v.appealReason = r;
        v.appealed = true;
        return { actor: 'owner', action: 'APPEALED', note: r, status: 'APPEALED' };
      },
    ));
  }

  // --- Brand (read-only) ---

  /** Confirmed / resolved violations of approved KOLs, public fields only. Brand accounts only (4016). */
  async function listForBrand(): Promise<BrandViolation[]> {
    await wait();
    const s = db.read();
    currentBizAccount(s);
    return (s.violations ?? [])
      .slice()
      .sort(byNewest)
      .map((v) => toBrand(s, v))
      .filter((v): v is BrandViolation => v !== null);
  }

  /**
   * Brand/Agency reports a channel (optionally one piece of content) → PENDING_REVIEW, source REPORT.
   * Brand accounts only (4016). One pending report per reporter + channel + content link (4608).
   */
  async function reportByBrand(input: BrandReportInput): Promise<Violation> {
    await wait();
    const t = now();
    const note = (input.note ?? '').trim();
    const rawUrl = (input.contentUrl ?? '').trim();
    let out!: Violation;
    db.update((s) => {
      const acc = currentBizAccount(s);
      const ch = s.channels.find((c) => c.id === input.channelId);
      if (!ch) throw new KolhubError('KOLHUB-4611');
      if (!VIOLATION_CATEGORIES.includes(input.category)) throw new KolhubError('KOLHUB-4612', { field: 'category' });
      if (rawUrl && detectPlatform(rawUrl) !== ch.platform) throw new KolhubError('KOLHUB-4610', { field: 'contentUrl' });
      if (note.length < REPORT_NOTE_MIN || note.length > REPORT_NOTE_MAX) throw new KolhubError('KOLHUB-4609', { field: 'note' });
      const key = rawUrl ? normalizeChannelUrl(rawUrl) : '';
      s.violations ??= [];
      const dup = s.violations.some(
        (v) =>
          v.status === 'PENDING_REVIEW' &&
          v.source === 'REPORT' &&
          v.reporter?.accountId === acc.id &&
          v.channelId === ch.id &&
          (v.contentUrl ? normalizeChannelUrl(v.contentUrl) : '') === key,
      );
      if (dup) throw new KolhubError('KOLHUB-4608');
      const handle = (ch.handle || handleOfUrl(ch.url)).replace(/^@/, '');
      const v: Violation = {
        id: `vio-rp-${t.toString(36)}-${s.violations.length}`,
        ownerType: ch.ownerType,
        ownerId: ch.ownerId,
        channelId: ch.id,
        platform: ch.platform,
        channelHandle: handle,
        channelUrl: ch.url.replace(/^https?:\/\//i, ''),
        contentTitle: rawUrl ? 'Nội dung được báo cáo' : `Kênh @${handle}`,
        category: input.category,
        severity: input.severity ?? 'medium',
        source: 'REPORT',
        reporterNote: note,
        reporter: { accountId: acc.id, ...(acc.company ? { company: acc.company } : {}) },
        detectedAt: t,
        status: 'PENDING_REVIEW',
        history: [{ at: t, actor: 'reporter', action: 'REPORTED', note: 'Nhãn hàng gửi báo cáo' }],
        updatedAt: t,
      };
      if (rawUrl) v.contentUrl = rawUrl;
      if (ch.ownerType === 'KOL') {
        const kolId = s.kolProfiles.find((p) => p.accountId === ch.ownerId && p.status === 'APPROVED')?.kolId;
        if (kolId) v.kolId = kolId;
      }
      s.violations.push(v);
      out = structuredClone(v);
    });
    return out;
  }

  // --- Admin (demo panel) ---

  async function adminQueue(): Promise<ViolationAdminQueue> {
    await wait();
    const all = (db.read().violations ?? []).slice().sort(byNewest);
    return { pending: all.filter((v) => v.status === 'PENDING_REVIEW'), appealed: all.filter((v) => v.status === 'APPEALED') };
  }

  /** Admin: every violation (any status). */
  async function listAll(): Promise<Violation[]> {
    await wait();
    return (db.read().violations ?? []).slice().sort(byNewest);
  }

  async function confirm(id: string, note?: string): Promise<Violation> {
    await wait();
    const n = (note ?? '').trim();
    return transition(
      id,
      (v) => requireStatus(v, 'PENDING_REVIEW'),
      () => ({ actor: 'admin', action: 'CONFIRMED', note: n || undefined, status: 'CONFIRMED' }),
    );
  }

  async function dismiss(id: string, reason: string): Promise<Violation> {
    await wait();
    let r = '';
    return transition(
      id,
      (v) => {
        requireStatus(v, 'PENDING_REVIEW');
        r = requireReason(reason);
      },
      (v) => {
        v.adminReason = r;
        return { actor: 'admin', action: 'DISMISSED', note: r, status: 'DISMISSED' };
      },
    );
  }

  async function acceptAppeal(id: string, reason: string): Promise<Violation> {
    await wait();
    let r = '';
    return transition(
      id,
      (v) => {
        requireStatus(v, 'APPEALED');
        r = requireReason(reason);
      },
      (v) => {
        v.adminReason = r;
        return { actor: 'admin', action: 'APPEAL_ACCEPTED', note: r, status: 'DISMISSED' };
      },
    );
  }

  async function rejectAppeal(id: string, reason: string): Promise<Violation> {
    await wait();
    let r = '';
    return transition(
      id,
      (v) => {
        requireStatus(v, 'APPEALED');
        r = requireReason(reason);
      },
      (v) => {
        v.adminReason = r;
        return { actor: 'admin', action: 'APPEAL_REJECTED', note: r, status: 'CONFIRMED' };
      },
    );
  }

  return { listForOwner, markResolved, appeal, listForBrand, reportByBrand, adminQueue, listAll, confirm, dismiss, acceptAppeal, rejectAppeal };
}

export type ViolationService = ReturnType<typeof createViolationService>;
