import { KolhubError } from '../types';
import { FIELD_LIMIT, type ActivityField } from '../bizTypes';
import { normalizeText } from './directory';
import {
  BIO_MAX,
  ValidationError,
  type ChangeField,
  type ChangeRequest,
  type ContactInfo,
  type KolProfile,
  type McnProfile,
  type OrgChange,
  type OrgIdentity,
  type StaffInfo,
  type StoredFile,
} from '../profile-types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { validateGcnFile, validateProofImage } from './channelRules';
import { isValidEmail, isValidPhone, normalizePhone } from './normalize';
import {
  completeness,
  emptyKolProfile,
  emptyMcnProfile,
  findProfile,
  profileRecommendations,
  submitChecklist,
  sweepExpired,
  type ChecklistItem,
  type Completeness,
} from './profileRules';

export interface ProfileView {
  profile: KolProfile | McnProfile;
  completeness: Completeness;
  channelCount: number;
  pendingChanges: ChangeRequest[];
  /** BR-64/65 items without the pledges row (the screen adds it) — required to submit. */
  checklist: ChecklistItem[];
  /** Recommended, non-blocking items (MCN: staff, channel, KOL assignment; KOL: none). */
  recommendations: ChecklistItem[];
}

export function newId(prefix: string, now: number): string {
  return `${prefix}-${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Identity edits: saved directly, sent for approval, or locked (BR-27, BR-43). */
function writeMode(p: KolProfile | McnProfile): 'direct' | 'pending' | 'locked' {
  if (p.status === 'DRAFT' || p.status === 'NEEDS_FIX') return 'direct';
  if (p.status === 'SUBMITTED' || p.status === 'APPROVED') return 'pending';
  return 'locked';
}

function pendingOf(state: DemoState, ownerId: string, field: ChangeField): ChangeRequest | undefined {
  return state.changeRequests.find((c) => c.ownerId === ownerId && c.field === field && c.status === 'PENDING_CHANGE');
}

function dropPending(state: DemoState, ownerId: string, field: ChangeField) {
  state.changeRequests = state.changeRequests.filter(
    (c) => !(c.ownerId === ownerId && c.field === field && c.status === 'PENDING_CHANGE'),
  );
}

function upsertPending(
  state: DemoState,
  p: KolProfile | McnProfile,
  field: ChangeField,
  oldValue: string | OrgChange,
  newValue: string | OrgChange,
  now: number,
) {
  const existing = pendingOf(state, p.accountId, field);
  if (existing) {
    existing.newValue = newValue;
    existing.oldValue = oldValue;
    existing.createdAt = now;
    return;
  }
  state.changeRequests.push({
    id: newId('chg', now),
    ownerType: p.ownerType,
    ownerId: p.accountId,
    field,
    oldValue,
    newValue,
    status: 'PENDING_CHANGE',
    createdAt: now,
  });
}

/**
 * Change a KOL display name: saved directly in DRAFT/NEEDS_FIX, a PENDING_CHANGE
 * request in SUBMITTED/APPROVED (display value unchanged). Mutates `state`.
 */
export function applyDisplayName(state: DemoState, p: KolProfile, name: string, now: number): 'applied' | 'pending' {
  const next = name.trim().replace(/\s+/g, ' ');
  const mode = writeMode(p);
  if (mode === 'locked') {
    if (next === p.contact.displayName) return 'applied';
    throw new ValidationError('displayName', 'Hồ sơ không được duyệt nên không thể đổi họ tên.');
  }
  if (mode === 'direct') {
    p.contact.displayName = next;
    p.updatedAt = now;
    return 'applied';
  }
  if (next === p.contact.displayName) {
    dropPending(state, p.accountId, 'displayName');
    return 'applied';
  }
  upsertPending(state, p, 'displayName', p.contact.displayName, next, now);
  return 'pending';
}

const trimOrg = (o: OrgIdentity): OrgIdentity => ({
  orgName: o.orgName.trim(),
  regNo: o.regNo.trim(),
  regDate: o.regDate.trim(),
  regBy: o.regBy.trim(),
  legalRep: o.legalRep.trim(),
});

const sameOrg = (a: OrgIdentity, b: OrgIdentity) =>
  a.orgName === b.orgName && a.regNo === b.regNo && a.regDate === b.regDate && a.regBy === b.regBy && a.legalRep === b.legalRep;

const sameFile = (a?: StoredFile, b?: StoredFile) =>
  a === b || (!!a && !!b && a.name === b.name && a.size === b.size && a.type === b.type);

const regKey = (r: string) => r.replace(/\s/g, '');

function assertRegNoFree(state: DemoState, ownerId: string, regNo: string) {
  const key = regKey(regNo);
  if (!key) return;
  const taken =
    state.mcnProfiles.some((m) => m.accountId !== ownerId && regKey(m.org.regNo) === key) ||
    state.changeRequests.some(
      (c) =>
        c.ownerId !== ownerId &&
        c.field === 'orgIdentity' &&
        c.status === 'PENDING_CHANGE' &&
        typeof c.newValue !== 'string' &&
        regKey(c.newValue.org.regNo) === key,
    );
  if (taken) throw new KolhubError('KOLHUB-4303', { field: 'regNo' });
}

export function buildProfileView(state: DemoState, accountId: string): ProfileView {
  const profile = findProfile(state, accountId);
  if (!profile) throw new Error('PROFILE_NOT_FOUND');
  return {
    profile,
    completeness: completeness(state, accountId),
    channelCount: state.channels.filter((c) => c.ownerId === accountId).length,
    pendingChanges: state.changeRequests.filter((c) => c.ownerId === accountId && c.status === 'PENDING_CHANGE'),
    checklist: submitChecklist(state, accountId, [true, true, true]).filter((i) => i.key !== 'pledges'),
    recommendations: profileRecommendations(state, accountId),
  };
}

/** Create the DRAFT profile of a KOL/MCN account that has none yet (e.g. just registered). */
export function ensureProfile(state: DemoState, accountId: string, now: number): KolProfile | McnProfile {
  const existing = findProfile(state, accountId);
  if (existing) return existing;
  const acc = state.accounts.find((a) => a.id === accountId);
  if (!acc || acc.type === 'BIZ') throw new Error('PROFILE_NOT_FOUND');
  if (acc.type === 'KOL') {
    const p = emptyKolProfile(acc, now);
    state.kolProfiles.push(p);
    return p;
  }
  const p = emptyMcnProfile(acc, now);
  state.mcnProfiles.push(p);
  return p;
}

function needsWrite(state: DemoState, accountId: string, now: number): boolean {
  return (
    !findProfile(state, accountId) ||
    state.channels.some((c) => c.status === 'VERIFIED' && c.badgeExpiresAt !== undefined && c.badgeExpiresAt <= now)
  );
}

const fieldKey = (name: string) => normalizeText(name);

/**
 * Validate KOL-declared "Lĩnh vực hoạt động" (1–3, unique, first = category). Medals cannot be
 * self-assigned: an entry keeps the medal it already had (seed/Admin data), new entries get `none`.
 */
function checkFields(fields: ActivityField[], category: string, prev: ActivityField[]): ActivityField[] {
  const bad = (msg: string) => new ValidationError('fields', msg);
  const names = fields.map((f) => (f?.name ?? '').trim().replace(/\s+/g, ' '));
  if (names.length < 1 || names.length > FIELD_LIMIT) throw bad(`Chọn từ 1 đến ${FIELD_LIMIT} lĩnh vực hoạt động`);
  if (names.some((n) => !n)) throw bad('Tên lĩnh vực không được để trống');
  if (fieldKey(names[0]) !== fieldKey(category)) throw bad('Lĩnh vực đầu tiên phải là Lĩnh vực chính');
  if (new Set(names.map(fieldKey)).size !== names.length) throw bad('Lĩnh vực hoạt động bị trùng');
  const medalOf = new Map(prev.map((f) => [fieldKey(f.name), f.medal]));
  return names.map((name, i) => ({ name: i === 0 ? category : name, medal: medalOf.get(fieldKey(name)) ?? 'none' }));
}

/** Keep fields consistent after a category change: first entry = new category, no duplicate of it. */
function followCategory(prev: ActivityField[], category: string): ActivityField[] {
  if (!category) return [];
  const key = fieldKey(category);
  const old = prev.find((f) => fieldKey(f.name) === key);
  const rest = prev.slice(1).filter((f) => fieldKey(f.name) !== key);
  return [{ name: category, medal: old?.medal ?? 'none' }, ...rest].slice(0, FIELD_LIMIT);
}

export interface ProfileServiceDeps {
  db: Db;
  now: () => number;
  delay?: false;
}

/** Mock profile service: contact, staff, images, MCN identity, pending changes (BR-27, BR-43). */
export function createProfileService(deps: ProfileServiceDeps) {
  const { db, now } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());

  /** Apply `fn` to the (ensured) profile and return the fresh view. */
  function mutate(accountId: string, fn: (s: DemoState, p: KolProfile | McnProfile, t: number) => void): ProfileView {
    const t = now();
    db.update((s) => {
      const p = ensureProfile(s, accountId, t);
      fn(s, p, t);
    });
    return buildProfileView(db.read(), accountId);
  }

  async function getProfile(accountId: string): Promise<ProfileView> {
    await wait();
    const t = now();
    // Only write when needed: every write notifies live screens, which reload.
    if (needsWrite(db.read(), accountId, t)) {
      db.update((s) => {
        ensureProfile(s, accountId, t);
        sweepExpired(s, t);
      });
    }
    return buildProfileView(db.read(), accountId);
  }

  async function updateContact(accountId: string, patch: Partial<ContactInfo>): Promise<ProfileView> {
    await wait();
    if (patch.phone !== undefined && patch.phone.trim() !== '' && !isValidPhone(patch.phone))
      throw new ValidationError('phone', 'Số điện thoại không hợp lệ');
    if (patch.email !== undefined && patch.email.trim() !== '' && !isValidEmail(patch.email))
      throw new ValidationError('email', 'Email không hợp lệ');
    if (patch.zalo !== undefined && patch.zalo.trim() !== '' && !isValidPhone(patch.zalo))
      throw new ValidationError('zalo', 'Số Zalo không hợp lệ');

    const bio = patch.bio === undefined ? undefined : patch.bio.trim();
    if (bio !== undefined && [...bio].length > BIO_MAX)
      throw new ValidationError('bio', `Giới thiệu tối đa ${BIO_MAX} ký tự`);

    return mutate(accountId, (s, p, t) => {
      const { displayName, bio: _bio, fields, ...rest } = patch;
      const prevFields = p.contact.fields ?? [];
      for (const [k, v] of Object.entries(rest) as [Exclude<keyof ContactInfo, 'bio' | 'fields'>, string][]) {
        if (v === undefined) continue;
        p.contact[k] = k === 'phone' || k === 'zalo' ? (v.trim() ? normalizePhone(v) : '') : v.trim();
      }
      if (bio !== undefined) p.contact.bio = bio;
      if (fields !== undefined) p.contact.fields = checkFields(fields, p.contact.category, prevFields);
      else if (rest.category !== undefined) p.contact.fields = followCategory(prevFields, p.contact.category);
      if (displayName !== undefined) {
        if (p.ownerType === 'KOL') applyDisplayName(s, p, displayName, t);
        else p.contact.displayName = displayName.trim();
      }
      p.updatedAt = t;
    });
  }

  async function updateStaff(accountId: string, staff: StaffInfo): Promise<ProfileView> {
    await wait();
    if (staff.staffPhone.trim() !== '' && !isValidPhone(staff.staffPhone))
      throw new ValidationError('staffPhone', 'Số điện thoại không hợp lệ');
    if (staff.staffEmail.trim() !== '' && !isValidEmail(staff.staffEmail))
      throw new ValidationError('staffEmail', 'Email không hợp lệ');
    return mutate(accountId, (_s, p, t) => {
      p.staff = {
        staffName: staff.staffName.trim(),
        staffPhone: staff.staffPhone.trim() ? normalizePhone(staff.staffPhone) : '',
        staffEmail: staff.staffEmail.trim(),
      };
      p.updatedAt = t;
    });
  }

  async function updateImages(accountId: string, images: { avatar?: StoredFile; cover?: StoredFile }): Promise<ProfileView> {
    await wait();
    if (images.avatar) validateProofImage(images.avatar);
    if (images.cover) validateProofImage(images.cover);
    return mutate(accountId, (_s, p, t) => {
      if (images.avatar) p.avatar = images.avatar;
      if (images.cover) p.cover = images.cover;
      p.updatedAt = t;
    });
  }

  function asMcn(p: KolProfile | McnProfile): McnProfile {
    if (p.ownerType !== 'MCN') throw new Error('NOT_MCN');
    return p;
  }

  async function updateOrgIdentity(accountId: string, org: OrgIdentity): Promise<ProfileView> {
    await wait();
    const next = trimOrg(org);
    return mutate(accountId, (s, raw, t) => {
      const p = asMcn(raw);
      const mode = writeMode(p);
      if (mode === 'locked') throw new Error('IDENTITY_LOCKED');
      assertRegNoFree(s, accountId, next.regNo);
      if (mode === 'direct') {
        p.org = next;
        p.updatedAt = t;
        return;
      }
      const pending = pendingOf(s, accountId, 'orgIdentity');
      const pendingFile = pending && typeof pending.newValue !== 'string' ? pending.newValue.gcnFile : undefined;
      const gcnFile = pendingFile ?? p.gcnFile;
      if (sameOrg(next, p.org) && sameFile(gcnFile, p.gcnFile)) {
        dropPending(s, accountId, 'orgIdentity');
        return;
      }
      upsertPending(s, p, 'orgIdentity', { org: p.org, gcnFile: p.gcnFile }, { org: next, gcnFile }, t);
    });
  }

  async function uploadGcn(accountId: string, file: StoredFile): Promise<ProfileView> {
    await wait();
    validateGcnFile(file);
    return mutate(accountId, (s, raw, t) => {
      const p = asMcn(raw);
      const mode = writeMode(p);
      if (mode === 'locked') throw new Error('IDENTITY_LOCKED');
      if (mode === 'direct') {
        p.gcnFile = file;
        p.updatedAt = t;
        return;
      }
      const pending = pendingOf(s, accountId, 'orgIdentity');
      const org = pending && typeof pending.newValue !== 'string' ? pending.newValue.org : p.org;
      upsertPending(s, p, 'orgIdentity', { org: p.org, gcnFile: p.gcnFile }, { org, gcnFile: file }, t);
    });
  }

  return { getProfile, updateContact, updateStaff, updateImages, updateOrgIdentity, uploadGcn };
}

export type ProfileService = ReturnType<typeof createProfileService>;
