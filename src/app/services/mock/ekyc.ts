import { KolhubError, type ErrorCode } from '../types';
import type { EkycScenario, EkycStatus, KolProfile, OcrData, StoredFile } from '../profile-types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { trackFunnel } from './funnel';
import { applyDisplayName, ensureProfile, newId } from './profile';
import { findProfile, maskIdNo, normalizeName } from './profileRules';

export interface IdentityView {
  fullName: string;
  dob: string;
  idNoMasked: string;
  issueDate: string;
  verifiedAt: number;
}

export interface EkycView {
  status: EkycStatus;
  attemptsLeft: number;
  lockedUntil?: number;
  draft?: OcrData & { nameMismatch: boolean; profileName: string };
  identity?: IdentityView;
}

/** Failures that count towards the 5-in-24h lock (BR-13, §7.4). */
export const COUNTED_CODES: ErrorCode[] = ['KOLHUB-4101', 'KOLHUB-4102', 'KOLHUB-4105', 'KOLHUB-4106'];
export const OCR_CODES: ErrorCode[] = ['KOLHUB-4101', 'KOLHUB-4102', 'KOLHUB-4103', 'KOLHUB-4104'];
export const FACE_CODES: ErrorCode[] = ['KOLHUB-4105', 'KOLHUB-4106'];
/** 4107 and 5101 apply to both steps. */
const BOTH_STEPS: ErrorCode[] = ['KOLHUB-4107', 'KOLHUB-5101'];

export const MAX_EKYC_ATTEMPTS = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MISMATCH_NAME = 'TRẦN THỊ BÌNH';
const DEFAULT_NAME = 'NGUYỄN VĂN AN';

function hashDigits(s: string, n: number): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return String(h % 10 ** n).padStart(n, '0');
}

function lockInfo(state: DemoState, accountId: string, now: number) {
  const sessions = state.ekycSessions.filter((x) => x.accountId === accountId);
  let lastLock: (typeof sessions)[number] | undefined;
  for (const x of sessions) if (x.lockedUntil !== undefined && (!lastLock || x.createdAt >= lastLock.createdAt)) lastLock = x;
  const lockedUntil = lastLock && lastLock.lockedUntil! > now ? lastLock.lockedUntil : undefined;
  const used = sessions.filter(
    (x) => x.counted && x.createdAt > now - WINDOW_MS && (!lastLock || x.createdAt > lastLock.createdAt),
  ).length;
  return { lockedUntil, used };
}

function kolOf(state: DemoState, accountId: string, now: number): KolProfile {
  const p = ensureProfile(state, accountId, now);
  if (p.ownerType !== 'KOL') throw new Error('NOT_KOL');
  return p;
}

function subjectOf(state: DemoState, accountId: string): string {
  return state.accounts.find((a) => a.id === accountId)?.email ?? '';
}

function fakeOcr(p: KolProfile, scenario: EkycScenario): OcrData {
  const fullName =
    scenario === 'KOLHUB-4103' ? MISMATCH_NAME : p.contact.displayName.trim() ? normalizeName(p.contact.displayName) : DEFAULT_NAME;
  return {
    fullName,
    dob: '14/05/1996',
    issueDate: '10/08/2021',
    idNoMasked: maskIdNo('079096' + hashDigits(p.accountId, 6)),
  };
}

function buildView(state: DemoState, accountId: string, now: number): EkycView {
  const p = findProfile(state, accountId);
  if (!p || p.ownerType !== 'KOL') throw new Error('NOT_KOL');
  const { lockedUntil, used } = lockInfo(state, accountId, now);
  const id = state.identities.find((x) => x.accountId === accountId);
  return {
    status: p.ekycStatus,
    attemptsLeft: lockedUntil ? 0 : Math.max(0, MAX_EKYC_ATTEMPTS - used),
    ...(lockedUntil ? { lockedUntil } : {}),
    ...(p.ekycDraft ? { draft: { ...p.ekycDraft, profileName: p.contact.displayName } } : {}),
    ...(id
      ? {
          identity: {
            fullName: id.fullName,
            dob: id.dob,
            idNoMasked: id.idNoMasked,
            issueDate: id.issueDate,
            verifiedAt: id.verifiedAt,
          },
        }
      : {}),
  };
}

export interface EkycServiceDeps {
  db: Db;
  now: () => number;
  delay?: false;
}

/** Scenario-driven mock eKYC (UC-07, BR-13, BR-14, §7.4). */
export function createEkycService(deps: EkycServiceDeps) {
  const { db, now } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());

  async function getState(accountId: string): Promise<EkycView> {
    await wait();
    const t = now();
    if (!findProfile(db.read(), accountId)) db.update((s) => void ensureProfile(s, accountId, t));
    return buildView(db.read(), accountId, t);
  }

  /**
   * Shared attempt flow: lock check → step check → scenario → session record.
   * `onSuccess` mutates the state when the step passes.
   */
  function attempt(
    accountId: string,
    step: 'OCR' | 'FACE',
    allowed: EkycStatus[],
    onSuccess: (s: DemoState, p: KolProfile, t: number) => void,
    onFailure?: (s: DemoState, p: KolProfile, code: ErrorCode, t: number) => void,
  ): EkycView {
    const t = now();
    const state = db.read();
    const { lockedUntil } = lockInfo(state, accountId, t);
    if (lockedUntil) throw new KolhubError('KOLHUB-4108', { lockedUntil });
    const p0 = findProfile(state, accountId);
    const status = p0 && p0.ownerType === 'KOL' ? p0.ekycStatus : 'NOT_STARTED';
    if (!allowed.includes(status)) throw new Error('EKYC_STEP');

    const scenario = state.ekycScenario;
    const stepCodes = step === 'OCR' ? OCR_CODES : FACE_CODES;
    const code: ErrorCode | null =
      scenario !== 'SUCCESS' && (stepCodes.includes(scenario) || BOTH_STEPS.includes(scenario)) ? scenario : null;
    const counted = code !== null && COUNTED_CODES.includes(code);

    let error: KolhubError | null = null;
    db.update((s) => {
      const p = kolOf(s, accountId, t);
      const session = { id: newId('ekyc', t), accountId, step, resultCode: code ?? ('OK' as const), counted, createdAt: t };
      s.ekycSessions.push(session);
      if (code === null) {
        onSuccess(s, p, t);
        return;
      }
      onFailure?.(s, p, code, t);
      if (counted) {
        const { used } = lockInfo(s, accountId, t);
        if (used >= MAX_EKYC_ATTEMPTS) {
          const until = t + WINDOW_MS;
          Object.assign(session, { lockedUntil: until });
          error = new KolhubError('KOLHUB-4108', { lockedUntil: until });
          return;
        }
        error = new KolhubError(code, { attemptsLeft: MAX_EKYC_ATTEMPTS - used });
        return;
      }
      error = new KolhubError(code);
    });
    if (error) throw error;
    return buildView(db.read(), accountId, t);
  }

  async function submitIdCard(accountId: string, _files: { front: StoredFile; back: StoredFile }): Promise<EkycView> {
    await wait();
    return attempt(
      accountId,
      'OCR',
      ['NOT_STARTED', 'OCR_PASSED'],
      (s, p, t) => {
        p.ekycDraft = { ...fakeOcr(p, 'SUCCESS'), nameMismatch: false };
        p.ekycStatus = 'OCR_PASSED';
        p.updatedAt = t;
        trackFunnel(s, subjectOf(s, accountId), 'ekyc_ocr_passed', t);
      },
      (_s, p, code, t) => {
        if (code === 'KOLHUB-4103') {
          p.ekycDraft = { ...fakeOcr(p, 'KOLHUB-4103'), nameMismatch: true };
          p.ekycStatus = 'NOT_STARTED';
          p.updatedAt = t;
        }
      },
    );
  }

  async function submitFaceVideo(accountId: string, _video: StoredFile): Promise<EkycView> {
    await wait();
    return attempt(accountId, 'FACE', ['OCR_PASSED'], (s, p, t) => {
      const ocr = p.ekycDraft ?? { ...fakeOcr(p, 'SUCCESS'), nameMismatch: false };
      const sessionId = s.ekycSessions[s.ekycSessions.length - 1].id;
      s.identities = s.identities.filter((x) => x.accountId !== accountId);
      s.identities.push({
        accountId,
        fullName: ocr.fullName,
        dob: ocr.dob,
        idNoMasked: ocr.idNoMasked,
        issueDate: ocr.issueDate,
        ekycSessionId: sessionId,
        verifiedAt: t,
      });
      delete p.ekycDraft;
      p.ekycStatus = 'PASSED';
      p.updatedAt = t;
      trackFunnel(s, subjectOf(s, accountId), 'ekyc_face_passed', t);
    });
  }

  async function resolveNameMismatch(accountId: string, choice: 'update-profile' | 'request-review'): Promise<EkycView> {
    await wait();
    const t = now();
    db.update((s) => {
      const p = kolOf(s, accountId, t);
      if (p.ekycStatus !== 'NOT_STARTED' || !p.ekycDraft?.nameMismatch) throw new Error('EKYC_STEP');
      if (choice === 'update-profile') {
        applyDisplayName(s, p, p.ekycDraft.fullName, t);
        p.ekycDraft.nameMismatch = false;
        p.ekycStatus = 'OCR_PASSED';
        trackFunnel(s, subjectOf(s, accountId), 'ekyc_ocr_passed', t);
      } else {
        p.ekycStatus = 'MANUAL_REVIEW';
      }
      p.updatedAt = t;
    });
    return buildView(db.read(), accountId, t);
  }

  async function reportImpersonation(accountId: string): Promise<EkycView> {
    await wait();
    const t = now();
    db.update((s) => {
      const p = kolOf(s, accountId, t);
      if (p.ekycStatus === 'PASSED') throw new Error('EKYC_STEP');
      delete p.ekycDraft;
      p.ekycStatus = 'REPORTED';
      p.updatedAt = t;
    });
    return buildView(db.read(), accountId, t);
  }

  function getScenario(): EkycScenario {
    return db.read().ekycScenario;
  }

  function setScenario(sc: EkycScenario): void {
    db.update((s) => {
      s.ekycScenario = sc;
    });
  }

  return { getState, submitIdCard, submitFaceVideo, resolveNameMismatch, reportImpersonation, getScenario, setScenario };
}

export type EkycService = ReturnType<typeof createEkycService>;
