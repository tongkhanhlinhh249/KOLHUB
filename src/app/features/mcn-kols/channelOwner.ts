// Owner of an MCN channel (assigned KOL or "Kênh riêng MCN"): `?kol=` URL filter and pure helpers.
import type { Channel, McnKolRow } from '../../services';

/** URL key of the owner filter on the MCN "Quản lý kênh" page (kept by the channel filters). */
export const OWNER_PARAM = 'kol';
/** `?kol=rieng` = channels not assigned to any KOL. */
export const OWN_CHANNELS = 'rieng';
export const OWN_CHANNELS_LABEL = 'Kênh riêng MCN';

const KOL_ID_RE = /^kol-\d{4}-\d{4}$/i;

/** `rieng`, an upper-cased KOL ID, or undefined (= Tất cả) for anything else. */
export function parseOwnerParam(v: string | null): string | undefined {
  const s = (v ?? '').trim();
  if (s.toLowerCase() === OWN_CHANNELS) return OWN_CHANNELS;
  return KOL_ID_RE.test(s) ? s.toUpperCase() : undefined;
}

/** Set / clear `?kol=` keeping every other param. */
export function withOwnerParam(prev: URLSearchParams, owner: string | undefined): URLSearchParams {
  const next = new URLSearchParams(prev);
  if (owner) next.set(OWNER_PARAM, owner);
  else next.delete(OWNER_PARAM);
  return next;
}

/** The KOL a channel is assigned to, from the MCN's `listKols` rows (null = Kênh riêng MCN). */
export function ownerOf(ch: Pick<Channel, 'assignedKolAccountId'>, kols: McnKolRow[]): McnKolRow | null {
  if (!ch.assignedKolAccountId) return null;
  return kols.find((k) => k.kolAccountId === ch.assignedKolAccountId) ?? null;
}

/** Channels of the owner filter; a KOL ID holding no channel of the MCN matches nothing. */
export function filterByOwner<T extends Pick<Channel, 'assignedKolAccountId'>>(channels: T[], owner: string | undefined, kols: McnKolRow[]): T[] {
  if (!owner) return channels;
  if (owner === OWN_CHANNELS) return channels.filter((c) => !ownerOf(c, kols));
  const kol = kols.find((k) => k.kolId === owner);
  return kol ? channels.filter((c) => c.assignedKolAccountId === kol.kolAccountId) : [];
}

/** Options of the owner select: Kênh riêng MCN, then each KOL holding channels (A → Z), with channel counts. */
export function ownerOptions(channels: Pick<Channel, 'assignedKolAccountId'>[], kols: McnKolRow[]): { key: string; label: string }[] {
  const active = [...kols].sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi'));
  return [
    { key: OWN_CHANNELS, label: `${OWN_CHANNELS_LABEL} (${filterByOwner(channels, OWN_CHANNELS, kols).length})` },
    ...active.map((k) => ({ key: k.kolId, label: `${k.displayName} (${filterByOwner(channels, k.kolId, kols).length})` })),
  ];
}
