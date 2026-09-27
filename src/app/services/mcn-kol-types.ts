// MCN ↔ KOL management: an approved MCN invites approved KOLs, and may assign its own channels to them.
import type { ActivityField, KolCategory, KolRegion } from './bizTypes';

export type McnKolLinkStatus = 'PENDING' | 'ACTIVE' | 'DECLINED' | 'ENDED';

/** One invitation / management relation. A cancelled invite is deleted (it never started). */
export interface McnKolLink {
  id: string;
  mcnAccountId: string;
  kolAccountId: string;
  status: McnKolLinkStatus;
  invitedAt: number;
  /** Set when the KOL accepts or declines. */
  respondedAt?: number;
  /** Set when an ACTIVE link ends (MCN ends it or KOL leaves). */
  endedAt?: number;
  /** Who ended the ACTIVE link. */
  endedBy?: 'MCN' | 'KOL';
}

export const MCN_KOL_STATUS_LABEL: Record<McnKolLinkStatus, string> = {
  PENDING: 'Chờ xác nhận',
  ACTIVE: 'Đang quản lý',
  DECLINED: 'Đã từ chối',
  ENDED: 'Đã kết thúc',
};

/** Row of the MCN "Quản lý KOL" list (latest link per KOL; public-ish KOL info only). */
export interface McnKolRow {
  linkId: string;
  kolAccountId: string;
  kolId: string;
  displayName: string;
  avatar?: string;
  category?: KolCategory;
  region?: KolRegion;
  /** Public "Lĩnh vực hoạt động" (0–3), shown on the MCN channels assigned to this KOL. */
  fields?: ActivityField[];
  /** Sum of followers of the KOL's own verified, active, unexpired channels. */
  totalFollowers: number;
  /** MCN channels currently assigned to this KOL (0 unless ACTIVE). */
  assignedChannelCount: number;
  status: McnKolLinkStatus;
  invitedAt: number;
  respondedAt?: number;
  endedAt?: number;
  endedBy?: 'MCN' | 'KOL';
}

/** An MCN as the KOL sees it (invite or current manager). */
export interface McnSummary {
  linkId: string;
  mcnAccountId: string;
  mcnId?: string;
  name: string;
  avatar?: string;
  province?: string;
  invitedAt: number;
}

export interface CurrentMcn extends McnSummary {
  /** When the KOL accepted. */
  since: number;
  /** MCN channels assigned to the KOL. */
  assignedChannelCount: number;
}

/** Tabs of the MCN list: DECLINED and ENDED rows are shown together under "Đã kết thúc". */
export type McnKolTab = 'ACTIVE' | 'PENDING' | 'CLOSED';

export function mcnKolTabOf(status: McnKolLinkStatus): McnKolTab {
  return status === 'ACTIVE' ? 'ACTIVE' : status === 'PENDING' ? 'PENDING' : 'CLOSED';
}
