import type { DemoAccountKey, DemoStep } from '../services';

/** Tabs of the demo panel, one per role plus "Hệ thống". */
export type DemoTab = 'biz' | 'kol' | 'mcn' | 'admin' | 'system';
/** Role of a demo account (the guest is its own role). */
export type DemoRole = 'guest' | 'kol' | 'mcn' | 'biz';

export const DEMO_TABS: { id: DemoTab; label: string }[] = [
  { id: 'biz', label: 'Nhãn hàng' },
  { id: 'kol', label: 'KOL' },
  { id: 'mcn', label: 'MCN' },
  { id: 'admin', label: 'Admin' },
  { id: 'system', label: 'Hệ thống' },
];

/** Blocks of the panel; each tab lists its own, in order. */
export type DemoBlock = 'profile' | 'campaign' | 'admin' | 'violations' | 'funnel' | 'data' | 'external' | 'assumptions';

export const TAB_BLOCKS: Record<DemoTab, DemoBlock[]> = {
  biz: ['campaign'],
  kol: ['profile', 'campaign'],
  mcn: ['profile', 'campaign'],
  admin: ['admin', 'violations', 'funnel'],
  system: ['data', 'external', 'assumptions'],
};

export function roleOfAccount(key: DemoAccountKey | undefined): DemoRole {
  if (!key || key === 'guest') return 'guest';
  return key.split('-')[0] as DemoRole;
}

/** Tab opened by default for the signed-in account; a guest starts on KOL (sign-up and profile are KOL-first). */
export function defaultTab(key: DemoAccountKey | undefined): DemoTab {
  const role = roleOfAccount(key);
  return role === 'guest' ? 'kol' : role;
}

const isTab = (v: unknown): v is DemoTab => DEMO_TABS.some((t) => t.id === v);

/** Last manual choice (saved with the role it was made for), or the role default once the role has changed. */
export function restoreTab(saved: unknown, key: DemoAccountKey | undefined): DemoTab {
  const s = saved as { tab?: unknown; role?: unknown } | null;
  if (s && isTab(s.tab) && s.role === roleOfAccount(key)) return s.tab;
  return defaultTab(key);
}

/** Role tabs that have a "Tài khoản" switch between a new and a verified sample account. */
export type RoleTab = Extract<DemoTab, 'biz' | 'kol' | 'mcn'>;
export const isRoleTab = (t: DemoTab): t is RoleTab => t === 'biz' || t === 'kol' || t === 'mcn';

export const ROLE_ACCOUNTS: Record<RoleTab, { fresh: Exclude<DemoAccountKey, 'guest'>; verified: Exclude<DemoAccountKey, 'guest'> }> = {
  biz: { fresh: 'biz-new', verified: 'biz-verified' },
  kol: { fresh: 'kol-new', verified: 'kol-verified' },
  mcn: { fresh: 'mcn-new', verified: 'mcn-verified' },
};

/**
 * "Hồ sơ mẫu" (fill a new profile) only works for a signed-in KOL/MCN with a new profile:
 * `use` when the current account is that one, otherwise the account to switch to. Not offered on the brand tab.
 */
export function sampleProfileAccess(tab: DemoTab, key: DemoAccountKey | undefined): { kind: 'use' } | { kind: 'switch'; to: DemoAccountKey } | null {
  if (tab !== 'kol' && tab !== 'mcn') return null;
  const fresh = ROLE_ACCOUNTS[tab].fresh;
  return key === fresh ? { kind: 'use' } : { kind: 'switch', to: fresh };
}

/** eKYC result picker: KOL only (MCN has no eKYC step). */
export const showsEkyc = (tab: DemoTab) => tab === 'kol';

export type CampaignSide = 'BRAND' | 'SUPPLIER';
export const SIDE_LABEL: Record<CampaignSide | 'SYSTEM', string> = {
  BRAND: 'Thao tác của Nhãn hàng',
  SUPPLIER: 'Thao tác của KOL/MCN',
  SYSTEM: 'Hệ thống',
};

export interface StepGroup {
  side: CampaignSide | 'SYSTEM';
  primary?: DemoStep;
  secondary: DemoStep[];
}

/** A booking's steps grouped by who acts, `first` side first, then the other side, then system steps; empty groups dropped. */
export function groupSteps(steps: { primary?: DemoStep; secondary: DemoStep[] }, first: CampaignSide): StepGroup[] {
  const order: StepGroup['side'][] = [first, first === 'BRAND' ? 'SUPPLIER' : 'BRAND', 'SYSTEM'];
  return order
    .map((side) => ({
      side,
      primary: steps.primary?.actor === side ? steps.primary : undefined,
      secondary: steps.secondary.filter((s) => s.actor === side),
    }))
    .filter((g) => g.primary || g.secondary.length);
}
