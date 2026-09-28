// MCN → KOL channel assignment: an approved MCN assigns its own channels to approved KOLs.
// The only relation is `Channel.assignedKolAccountId` on MCN-owned channels (no invites, no acceptance).
import type { ActivityField, KolCategory, KolRegion, Platform } from './bizTypes';

/** Approved KOL as shown in the KOL picker (public-ish info only, never the login email). */
export interface KolPickItem {
  kolAccountId: string;
  kolId: string;
  displayName: string;
  avatar?: string;
  category?: KolCategory;
  region?: KolRegion;
  /** Sum of followers of the KOL's own verified, active, unexpired channels. */
  totalFollowers: number;
}

export interface AssignedChannelRef {
  id: string;
  platform: Platform;
  handle: string;
  url: string;
}

/** Row of the MCN "Quản lý KOL" list: a KOL that currently holds ≥ 1 channel of the MCN. */
export interface McnKolRow extends KolPickItem {
  /** Public "Lĩnh vực hoạt động" (0–3), shown on the MCN channels assigned to this KOL. */
  fields?: ActivityField[];
  /** MCN channels currently assigned to this KOL. */
  assignedChannelCount: number;
  channels: AssignedChannelRef[];
  /** Latest `assignedAt` of those channels. */
  lastAssignedAt?: number;
}

/** Previous owner of a channel, returned by unassign so the UI can undo. */
export interface ChannelAssignment {
  channelId: string;
  kolAccountId: string;
}
