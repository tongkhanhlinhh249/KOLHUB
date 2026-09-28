// Demo-only shortcuts (Demo Panel). Not part of the product flow.
import type { Channel, KolProfile, McnProfile, Platform, StoredFile } from '../profile-types';
import type { Db, DemoState } from './db';
import { delay as fakeDelay } from './delay';
import { channelHandle, normalizeChannelUrl } from './channelRules';
import { simulateEkycPassed } from './ekyc';
import { trackFunnel } from './funnel';
import { isValidPhone } from './normalize';
import { buildProfileView, ensureProfile, newId, type ProfileView } from './profile';
import { activeWithProof, assignedKolChannels } from './profileRules';

export const SAMPLE_PROOF: StoredFile = { name: 'anh-quan-ly-kenh.png', type: 'image/png', size: 186_420 };
export const SAMPLE_GCN: StoredFile = { name: 'giay-chung-nhan-dkdn.pdf', type: 'application/pdf', size: 248_310 };

/** Stable digits from the account id, so every account gets its own sample handles / tax code. */
function digits(s: string, n: number): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return String(h % 10 ** n).padStart(n, '0');
}

const filled = (v: string | undefined) => !!v && v.trim() !== '';

function fillContact(p: KolProfile | McnProfile, accPhone: string | undefined) {
  const c = p.contact;
  const kol = p.ownerType === 'KOL';
  if (!filled(c.displayName)) c.displayName = kol ? 'Nguyễn Minh Anh' : 'Mây Xanh Media';
  if (!isValidPhone(c.phone ?? '')) c.phone = accPhone && isValidPhone(accPhone) ? accPhone : '0912345678';
  if (!filled(c.zalo)) c.zalo = c.phone;
  if (!filled(c.country)) c.country = 'Việt Nam';
  if (!filled(c.province)) c.province = 'TP. Hồ Chí Minh';
  if (!filled(c.address)) c.address = kol ? '25 Lê Thánh Tôn, Phường Bến Nghé, Quận 1' : '88 Nguyễn Thị Minh Khai, Phường 6, Quận 3';
  if (!filled(c.category)) c.category = kol ? 'Ẩm thực' : 'Giải trí';
  if (kol) {
    if (!filled(c.bio)) {
      c.bio = 'Chia sẻ món ngon đường phố và công thức nấu ăn đơn giản mỗi tuần. Hợp tác review quán ăn, đồ gia dụng nhà bếp.';
    }
    if (!c.fields?.length) {
      c.fields = [
        { name: c.category, medal: 'none' },
        { name: c.category === 'Du lịch' ? 'Lifestyle' : 'Du lịch', medal: 'none' },
      ];
    }
  }
}

function fillStaff(p: KolProfile | McnProfile) {
  if (filled(p.staff.staffName) && isValidPhone(p.staff.staffPhone)) return;
  p.staff = { staffName: 'Lê Thu Hà', staffPhone: '0987654321', staffEmail: 'thuha.noidung@example.com' };
}

function fillOrg(state: DemoState, p: McnProfile) {
  const o = p.org;
  if (!filled(o.orgName)) o.orgName = 'Công ty TNHH Truyền thông Mây Xanh';
  if (!filled(o.regNo)) {
    let n = Number(digits(p.accountId, 8));
    const taken = (r: string) => state.mcnProfiles.some((m) => m.accountId !== p.accountId && m.org.regNo.replace(/\s/g, '') === r);
    let regNo = `03${String(n).padStart(8, '0')}`;
    while (taken(regNo)) regNo = `03${String(++n % 1e8).padStart(8, '0')}`;
    o.regNo = regNo;
  }
  if (!filled(o.regDate)) o.regDate = '2021-03-15';
  if (!filled(o.regBy)) o.regBy = 'Sở Kế hoạch và Đầu tư TP. Hồ Chí Minh';
  if (!filled(o.legalRep)) o.legalRep = 'Trần Quốc Bảo';
  if (!p.gcnFile) p.gcnFile = { ...SAMPLE_GCN };
}

/** First free URL (duplicate check = normalizeChannelUrl, BR-22) for a sample handle. */
function freeUrl(state: DemoState, make: (suffix: string) => string): string {
  const used = new Set(state.channels.map((c) => normalizeChannelUrl(c.url)));
  for (let i = 0; ; i++) {
    const url = make(i === 0 ? '' : String(i));
    if (!used.has(normalizeChannelUrl(url))) return url;
  }
}

function addSampleChannels(state: DemoState, p: KolProfile | McnProfile, t: number): Channel[] {
  const slug = `${p.ownerType === 'KOL' ? 'minhanh.bep' : 'mayxanh.media'}${digits(p.accountId, 4)}`;
  const specs: [Platform, (sfx: string) => string][] = [
    ['tiktok', (sfx) => `https://www.tiktok.com/@${slug}${sfx}`],
    ['facebook', (sfx) => `https://www.facebook.com/${slug}${sfx}`],
  ];
  const first = !state.channels.some((c) => c.ownerId === p.accountId);
  const added = specs.map(([platform, make], i) => {
    const url = freeUrl(state, make);
    const ch: Channel = {
      id: newId('ch', t + i),
      ownerType: p.ownerType,
      ownerId: p.accountId,
      platform,
      url,
      handle: channelHandle(url),
      proofImage: { ...SAMPLE_PROOF },
      status: 'PENDING_REVIEW',
      active: true,
      createdAt: t + i,
      updatedAt: t + i,
    };
    state.channels.push(ch);
    return ch;
  });
  if (first) trackFunnel(state, state.accounts.find((a) => a.id === p.accountId)?.email ?? '', 'channel_added', t);
  return added;
}

/** MCN: give one of its channels to the first approved KOL (same fields as mcnKolService.assignChannels). */
function assignSampleKol(state: DemoState, p: McnProfile, t: number) {
  if (assignedKolChannels(state, p.accountId).length > 0) return;
  const kol = state.kolProfiles.find((k) => k.status === 'APPROVED' && !!k.kolId);
  const ch = state.channels.find((c) => c.ownerId === p.accountId && c.ownerType === 'MCN' && c.active);
  if (!kol || !ch) return;
  ch.assignedKolAccountId = kol.accountId;
  ch.assignedAt = t;
  ch.updatedAt = t;
}

/**
 * "Điền nhanh hồ sơ mẫu": fills every required AND recommended item of a DRAFT / NEEDS_FIX KOL or MCN
 * profile with sample data — contact (+ bio / fields for KOL), content staff, KOL eKYC PASSED with
 * identity, MCN org fields + GCN file, 2 sample channels with proof (PENDING_REVIEW) when there is no
 * active one, MCN: one channel assigned to an approved KOL. Existing values are kept. Never submits.
 * Throws NOT_EDITABLE for any other profile status.
 */
export function fillSampleProfile(state: DemoState, accountId: string, t: number): void {
  const p = ensureProfile(state, accountId, t);
  if (p.status !== 'DRAFT' && p.status !== 'NEEDS_FIX') throw new Error('NOT_EDITABLE');
  const acc = state.accounts.find((a) => a.id === accountId);
  fillContact(p, acc?.phone);
  fillStaff(p);
  if (p.ownerType === 'KOL') simulateEkycPassed(state, accountId, t);
  else fillOrg(state, p);
  if (!state.channels.some((c) => c.ownerId === accountId && activeWithProof(c))) addSampleChannels(state, p, t);
  if (p.ownerType === 'MCN') assignSampleKol(state, p, t);
  p.updatedAt = t;
}

export interface DemoServiceDeps {
  db: Db;
  now: () => number;
  delay?: false;
}

export function createDemoService(deps: DemoServiceDeps) {
  const { db, now } = deps;
  const wait = () => (deps.delay === false ? Promise.resolve() : fakeDelay());

  async function fillSample(accountId: string): Promise<ProfileView> {
    await wait();
    const t = now();
    db.update((s) => fillSampleProfile(s, accountId, t));
    return buildProfileView(db.read(), accountId);
  }

  return { fillSampleProfile: fillSample };
}

export type DemoService = ReturnType<typeof createDemoService>;
