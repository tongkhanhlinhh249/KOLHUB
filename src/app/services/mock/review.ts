import { addMonths, format } from 'date-fns';
import type {
  ApprovedKolSummary,
  Channel,
  KolProfile,
  McnProfile,
  NoticeMessage,
  ReviewRequest,
} from '../profile-types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { trackFunnel } from './funnel';
import { newId } from './profile';
import { findProfile, submitChecklist } from './profileRules';

export type ChannelVerdict = { verdict: 'PASS' } | { verdict: 'NEEDS_FIX'; reason: string };

const REVIEW_TITLE = 'Kết quả xét duyệt hồ sơ';
const ALL_CHANNELS_NEED_FIX = 'Tất cả kênh cần bổ sung';

/** Active channels waiting for review. */
export function pendingChannelsOf(state: DemoState, ownerId: string): Channel[] {
  return state.channels.filter((c) => c.ownerId === ownerId && c.active && c.status === 'PENDING_REVIEW');
}

function fakeFollowers(url: string): number {
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) h = Math.imul(h ^ url.charCodeAt(i), 16777619) >>> 0;
  return 10_000 + (h % 1_990_001);
}

const emptyToUndef = (s: string) => (s.trim() ? s : undefined);

/**
 * Public summaries of approved KOLs with at least one verified, active, unexpired channel
 * (BR-16, BR-54, BR-58). No identity, phone, address or Zalo data. Phase 3 merges these into search.
 */
export function listApprovedKols(state: DemoState, now: number = Date.now()): ApprovedKolSummary[] {
  const out: ApprovedKolSummary[] = [];
  for (const p of state.kolProfiles) {
    if (p.status !== 'APPROVED' || !p.kolId) continue;
    const chs = state.channels.filter(
      (c) =>
        c.ownerId === p.accountId &&
        c.status === 'VERIFIED' &&
        c.active &&
        c.badgeExpiresAt !== undefined &&
        c.badgeExpiresAt > now,
    );
    if (!chs.length) continue;
    out.push({
      kolId: p.kolId,
      displayName: p.contact.displayName,
      avatar: p.avatar?.thumbnail,
      category: emptyToUndef(p.contact.category),
      region: emptyToUndef(p.contact.province),
      channels: chs.map((c) => ({
        platform: c.platform,
        url: c.url,
        followers: c.followers,
        badgeExpiresAt: new Date(c.badgeExpiresAt!).toISOString(),
      })),
      verifiedAt: new Date(p.approvedAt ?? p.decidedAt ?? now).toISOString(),
    });
  }
  return out;
}

export interface ReviewServiceDeps {
  db: Db;
  now: () => number;
  notify: (m: NoticeMessage) => void;
  delay?: false;
}

type AnyProfile = KolProfile | McnProfile;

function requireProfile(state: DemoState, ownerId: string): AnyProfile {
  const p = findProfile(state, ownerId);
  if (!p) throw new Error('PROFILE_NOT_FOUND');
  return p;
}

function requireReason(reason: string | undefined): string {
  const r = (reason ?? '').trim();
  if (!r) throw new Error('REASON_REQUIRED');
  return r;
}

function latestRequest(state: DemoState, ownerId: string): ReviewRequest | undefined {
  const list = state.reviewRequests.filter((r) => r.ownerId === ownerId);
  return list[list.length - 1];
}

/** Mock review + Admin simulation (BR-15..17, BR-44, BR-64/65). */
export function createReviewService(deps: ReviewServiceDeps) {
  const { db, now, notify } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());

  function send(p: AnyProfile, title: string, body: string) {
    if (p.contact.email) notify({ channel: 'email', target: p.contact.email, title, body });
    if (p.contact.phone) notify({ channel: 'sms', target: p.contact.phone, title, body });
  }

  async function submit(accountId: string, pledges: boolean[]): Promise<ReviewRequest> {
    await wait();
    const t = now();
    const id = newId('rev', t);
    db.update((s) => {
      const p = requireProfile(s, accountId);
      if (p.status !== 'DRAFT' && p.status !== 'NEEDS_FIX') throw new Error('NOT_SUBMITTABLE');
      if (!submitChecklist(s, accountId, pledges).every((i) => i.ok)) throw new Error('NOT_ELIGIBLE');
      p.status = 'SUBMITTED';
      p.submittedAt = t;
      p.decidedAt = undefined;
      p.decisionReason = undefined;
      p.updatedAt = t;
      s.reviewRequests.push({ id, ownerType: p.ownerType, ownerId: accountId, submittedAt: t, status: 'SUBMITTED' });
      const email = s.accounts.find((a) => a.id === accountId)?.email ?? p.contact.email;
      trackFunnel(s, email, 'profile_submitted', t);
    });
    return db.read().reviewRequests.find((r) => r.id === id)!;
  }

  async function approve(ownerId: string, verdicts: Record<string, ChannelVerdict>): Promise<void> {
    await wait();
    const t = now();
    const expires = addMonths(t, 12).getTime();
    const messages: string[] = [];
    let target: AnyProfile | undefined;

    db.update((s) => {
      const p = requireProfile(s, ownerId);
      const pending = pendingChannelsOf(s, ownerId);
      const wasApproved = p.status === 'APPROVED';
      if (p.status !== 'SUBMITTED' && !(wasApproved && pending.length)) throw new Error('NOT_REVIEWABLE');
      for (const c of pending) {
        const v = verdicts[c.id];
        if (!v) throw new Error('VERDICT_MISSING');
        if (v.verdict === 'NEEDS_FIX') requireReason(v.reason);
      }

      let passed = 0;
      let fixes = 0;
      for (const c of pending) {
        const v = verdicts[c.id];
        c.updatedAt = t;
        if (v.verdict === 'PASS') {
          passed++;
          c.status = 'VERIFIED';
          c.verifiedAt = t;
          c.badgeExpiresAt = expires;
          c.badgeSuspended = undefined;
          c.note = undefined;
          c.followers = fakeFollowers(c.url);
        } else {
          fixes++;
          c.status = 'NEEDS_FIX';
          c.note = v.reason.trim();
        }
      }

      const until = format(expires, 'dd/MM/yyyy');
      if (wasApproved) {
        if (passed) messages.push(`KOL Hub: Kênh mới của bạn đã được duyệt. ${passed} kênh nhận dấu Kênh xác thực, hiệu lực đến ${until}.`);
      } else {
        const hasVerified = s.channels.some((c) => c.ownerId === ownerId && c.status === 'VERIFIED');
        const approved = p.ownerType === 'MCN' || hasVerified;
        p.decidedAt = t;
        p.updatedAt = t;
        if (approved) {
          p.status = 'APPROVED';
          p.decisionReason = undefined;
          if (p.ownerType === 'KOL' && !p.kolId) {
            p.kolId = 'KH' + (900001 + s.kolProfiles.filter((x) => x.kolId).length);
            p.approvedAt = t;
          }
          if (p.ownerType === 'MCN' && !p.mcnId) {
            p.mcnId = 'MCN' + (900001 + s.mcnProfiles.filter((x) => x.mcnId).length);
            p.approvedAt = t;
          }
          p.approvedAt ??= t;
          messages.push(
            passed
              ? `KOL Hub: Hồ sơ của bạn đã được duyệt. ${passed} kênh nhận dấu Kênh xác thực, hiệu lực đến ${until}.`
              : 'KOL Hub: Hồ sơ của bạn đã được duyệt.',
          );
        } else {
          p.status = 'NEEDS_FIX';
          p.decisionReason = ALL_CHANNELS_NEED_FIX;
          messages.push(`KOL Hub: Hồ sơ của bạn cần bổ sung. Lý do: ${ALL_CHANNELS_NEED_FIX}`);
        }
        const req = latestRequest(s, ownerId);
        if (req) {
          req.status = approved ? 'APPROVED' : 'NEEDS_FIX';
          req.decidedAt = t;
          req.reason = approved ? undefined : ALL_CHANNELS_NEED_FIX;
        }
      }
      if (fixes) messages.push(`KOL Hub: ${fixes} kênh cần bổ sung. Vui lòng mở Quản lý kênh để xem lý do.`);
      target = p;
    });
    for (const body of messages) send(target!, REVIEW_TITLE, body);
  }

  async function decide(ownerId: string, reason: string, outcome: 'NEEDS_FIX' | 'REJECTED'): Promise<void> {
    await wait();
    const t = now();
    const r = requireReason(reason);
    let target: AnyProfile | undefined;
    db.update((s) => {
      const p = requireProfile(s, ownerId);
      if (p.status !== 'SUBMITTED') throw new Error('NOT_SUBMITTED');
      p.status = outcome;
      p.decisionReason = r;
      p.decidedAt = t;
      p.updatedAt = t;
      const req = latestRequest(s, ownerId);
      if (req) Object.assign(req, { status: outcome, decidedAt: t, reason: r });
      target = p;
    });
    send(
      target!,
      REVIEW_TITLE,
      outcome === 'NEEDS_FIX'
        ? `KOL Hub: Hồ sơ của bạn cần bổ sung. Lý do: ${r}`
        : `KOL Hub: Hồ sơ của bạn không được duyệt. Lý do: ${r}`,
    );
  }

  const requestFix = (ownerId: string, reason: string) => decide(ownerId, reason, 'NEEDS_FIX');
  const reject = (ownerId: string, reason: string) => decide(ownerId, reason, 'REJECTED');

  async function expireChannelNow(channelId: string): Promise<void> {
    await wait();
    const t = now();
    db.update((s) => {
      const c = s.channels.find((x) => x.id === channelId);
      if (!c) throw new Error('CHANNEL_NOT_FOUND');
      if (c.status !== 'VERIFIED') throw new Error('NOT_VERIFIED');
      c.status = 'EXPIRED';
      c.badgeExpiresAt = t;
      c.updatedAt = t;
    });
  }

  return { submit, approve, requestFix, reject, expireChannelNow };
}

export type ReviewService = ReturnType<typeof createReviewService>;
