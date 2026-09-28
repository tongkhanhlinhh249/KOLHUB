import { addMonths, format } from 'date-fns';
import type {
  ChangeRequest,
  Channel,
  KolProfile,
  McnProfile,
  NoticeMessage,
  OcrData,
  OrgIdentity,
  OwnerType,
  ProfileStatus,
  ReviewRequest,
  StoredFile,
} from '../profile-types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { trackFunnel } from './funnel';
import { newId } from './profile';
import { findProfile, submitChecklist, sweepExpired } from './profileRules';
import { syncChannelStats } from './socialListening';

export type ChannelVerdict = { verdict: 'PASS' } | { verdict: 'NEEDS_FIX'; reason: string };

const REVIEW_TITLE = 'Kết quả xét duyệt hồ sơ';
const ALL_CHANNELS_NEED_FIX = 'Tất cả kênh cần bổ sung';

/** Active channels waiting for review. */
export function pendingChannelsOf(state: DemoState, ownerId: string): Channel[] {
  return state.channels.filter((c) => c.ownerId === ownerId && c.active && c.status === 'PENDING_REVIEW');
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
/** Next public id in the seed format (KOL-2026-0041, MCN-2026-0002): highest number of that year + 1. */
export function nextOwnerId(prefix: 'KOL' | 'MCN', existing: (string | undefined)[], t: number): string {
  const year = new Date(t).getFullYear();
  const re = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let max = 0;
  for (const id of existing) {
    const m = id?.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`;
}

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
          c.stats = syncChannelStats(c, t);
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
            p.kolId = nextOwnerId('KOL', s.kolProfiles.map((x) => x.kolId), t);
            p.approvedAt = t;
          }
          if (p.ownerType === 'MCN' && !p.mcnId) {
            p.mcnId = nextOwnerId('MCN', s.mcnProfiles.map((x) => x.mcnId), t);
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

  function nameOf(s: DemoState, p: AnyProfile): string {
    const name = p.contact.displayName.trim() || (p.ownerType === 'MCN' ? p.org.orgName.trim() : '');
    return name || s.accounts.find((a) => a.id === p.accountId)?.email || p.accountId;
  }

  async function listAdminQueue(): Promise<AdminQueue> {
    await wait();
    const t = now();
    if (db.read().channels.some((c) => c.status === 'VERIFIED' && c.badgeExpiresAt !== undefined && c.badgeExpiresAt <= t)) {
      db.update((s) => sweepExpired(s, t));
    }
    const s = db.read();
    const all: AnyProfile[] = [...s.kolProfiles, ...s.mcnProfiles];
    const byId = new Map(all.map((p) => [p.accountId, p]));

    const profiles = all
      .filter((p) => p.status === 'SUBMITTED' || (p.status === 'APPROVED' && pendingChannelsOf(s, p.accountId).length))
      .sort((a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0))
      .map((p) => ({
        ownerType: p.ownerType,
        ownerId: p.accountId,
        displayName: nameOf(s, p),
        status: p.status,
        submittedAt: p.submittedAt,
        ...(p.ownerType === 'MCN' ? { org: p.org, gcnFile: p.gcnFile } : {}),
        pendingChannels: pendingChannelsOf(s, p.accountId),
      }));

    const changes = s.changeRequests
      .filter((c) => c.status === 'PENDING_CHANGE')
      .map((c) => ({ ...c, displayName: byId.has(c.ownerId) ? nameOf(s, byId.get(c.ownerId)!) : c.ownerId }));

    const ekycCases = s.kolProfiles
      .filter((p) => p.ekycStatus === 'MANUAL_REVIEW' || p.ekycStatus === 'REPORTED')
      .map((p) => ({
        accountId: p.accountId,
        displayName: nameOf(s, p),
        status: p.ekycStatus as 'MANUAL_REVIEW' | 'REPORTED',
        ...(p.ekycDraft
          ? {
              ocr: {
                fullName: p.ekycDraft.fullName,
                dob: p.ekycDraft.dob,
                idNoMasked: p.ekycDraft.idNoMasked,
                issueDate: p.ekycDraft.issueDate,
              },
            }
          : {}),
      }));

    const verifiedChannels = s.channels
      .filter((c) => c.status === 'VERIFIED')
      .map((c) => ({ ...c, displayName: byId.has(c.ownerId) ? nameOf(s, byId.get(c.ownerId)!) : c.ownerId }));

    return { profiles, changes, ekycCases, verifiedChannels };
  }

  async function decideChange(
    changeId: string,
    decision: { approve: true } | { approve: false; reason: string },
  ): Promise<void> {
    await wait();
    const t = now();
    const reason = decision.approve ? undefined : requireReason(decision.reason);
    let target: AnyProfile | undefined;
    let label = '';
    db.update((s) => {
      const c = s.changeRequests.find((x) => x.id === changeId);
      if (!c || c.status !== 'PENDING_CHANGE') throw new Error('CHANGE_NOT_FOUND');
      const p = requireProfile(s, c.ownerId);
      label = c.field === 'displayName' ? 'Họ tên KOL/KOC' : 'Thông tin định danh tổ chức';
      if (decision.approve) {
        if (c.field === 'displayName' && typeof c.newValue === 'string') p.contact.displayName = c.newValue;
        if (c.field === 'orgIdentity' && typeof c.newValue !== 'string' && p.ownerType === 'MCN') {
          p.org = c.newValue.org;
          p.gcnFile = c.newValue.gcnFile;
        }
        p.updatedAt = t;
      }
      c.status = decision.approve ? 'APPROVED' : 'REJECTED';
      c.decidedAt = t;
      c.reason = reason;
      target = p;
    });
    send(
      target!,
      CHANGE_TITLE,
      decision.approve
        ? `KOL Hub: Yêu cầu thay đổi ${label} đã được duyệt.`
        : `KOL Hub: Yêu cầu thay đổi ${label} không được duyệt. Lý do: ${reason}`,
    );
  }

  async function closeEkycCase(accountId: string, outcome: 'accept-name' | 'reset', reason?: string): Promise<void> {
    await wait();
    const t = now();
    let target: AnyProfile | undefined;
    db.update((s) => {
      const p = requireProfile(s, accountId);
      if (p.ownerType !== 'KOL' || (p.ekycStatus !== 'MANUAL_REVIEW' && p.ekycStatus !== 'REPORTED')) {
        throw new Error('EKYC_CASE_NOT_FOUND');
      }
      if (outcome === 'accept-name') {
        if (p.ekycStatus !== 'MANUAL_REVIEW' || !p.ekycDraft) throw new Error('EKYC_CASE_NOT_FOUND');
        p.contact.displayName = p.ekycDraft.fullName;
        p.ekycDraft.nameMismatch = false;
        p.ekycStatus = 'OCR_PASSED';
        const email = s.accounts.find((a) => a.id === accountId)?.email ?? p.contact.email;
        trackFunnel(s, email, 'ekyc_ocr_passed', t);
      } else {
        p.ekycStatus = 'NOT_STARTED';
        delete p.ekycDraft;
      }
      p.updatedAt = t;
      target = p;
    });
    const r = (reason ?? '').trim();
    const tail =
      outcome === 'accept-name'
        ? 'Bạn có thể tiếp tục quay video khuôn mặt.'
        : `Vui lòng xác thực lại.${r ? ` Lý do: ${r}` : ''}`;
    send(target!, EKYC_TITLE, `KOL Hub: Yêu cầu xem xét eKYC đã được xử lý. ${tail}`);
  }

  return {
    submit,
    approve,
    requestFix,
    reject,
    expireChannelNow,
    listAdminQueue,
    decideChange,
    closeEkycCase,
  };
}

const CHANGE_TITLE = 'Kết quả duyệt thay đổi hồ sơ';
const EKYC_TITLE = 'Kết quả xem xét eKYC';

export interface AdminQueue {
  profiles: {
    ownerType: OwnerType;
    ownerId: string;
    displayName: string;
    status: ProfileStatus;
    submittedAt?: number;
    org?: OrgIdentity;
    gcnFile?: StoredFile;
    pendingChannels: Channel[];
  }[];
  changes: (ChangeRequest & { displayName: string })[];
  ekycCases: { accountId: string; displayName: string; status: 'MANUAL_REVIEW' | 'REPORTED'; ocr?: OcrData }[];
  verifiedChannels: (Channel & { displayName: string })[];
}

export type ReviewService = ReturnType<typeof createReviewService>;
