import { useMemo } from 'react';
import { Link } from 'react-router';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { cn } from '../../components/ui/utils';
import {
  channelService,
  DELIVERABLE_QTY_MAX,
  DELIVERABLE_TYPES,
  deliverableLabel,
  PLATFORM_DELIVERABLES,
  mcnKolService,
  type Channel,
  type DeliverableType,
  type Platform,
  type SupplierType,
} from '../../services';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { formatFollowers } from '../biz-search/format';
import { channelName } from '../channels/ChannelParts';
import { useLiveQuery } from '../shared/useLiveQuery';
import { MCN_KOLS_PATH } from '../../auth/roles';
import { KolAvatar } from './parts';
import { eligibleChannels, fitType, newRowKey, type ItemDraft, type ItemErrors } from './proposalItems';
import { platformName } from './supplierBooking';

export interface KolOption {
  kolAccountId: string;
  kolId: string;
  displayName: string;
  avatar?: string;
}

export interface ProposalSources {
  kols: KolOption[];
  /** Eligible channels for a KOL (MCN) or the supplier itself (KOL). */
  channelsFor(kolAccountId?: string): Channel[];
  loading: boolean;
  error: unknown;
  reload(): void;
}

/** KOLs (MCN: its managed KOLs) and verified, active channels on the campaign platforms. */
export function useProposalSources(accountId: string, supplierType: SupplierType, platforms: Platform[], enabled: boolean): ProposalSources {
  const key = platforms.join(',');
  const q = useLiveQuery(async () => {
    if (!enabled) return null;
    const [channels, rows] = await Promise.all([
      channelService.list(accountId),
      supplierType === 'MCN' ? mcnKolService.listKols(accountId) : Promise.resolve([]),
    ]);
    return { channels, rows };
  }, [accountId, supplierType, key, enabled]);
  return useMemo(() => {
    const now = Date.now();
    const channels = q.data?.channels ?? [];
    const kols: KolOption[] = (q.data?.rows ?? []).map((r) => ({
      kolAccountId: r.kolAccountId,
      kolId: r.kolId,
      displayName: r.displayName,
      avatar: r.avatar,
    }));
    return {
      kols,
      channelsFor: (kolAccountId?: string) => eligibleChannels(channels, platforms, now, supplierType, kolAccountId),
      // While enabled the query resolves to an object; null = not loaded yet (or just re-enabled).
      loading: enabled && !q.data && !q.error,
      error: q.error,
      reload: q.reload,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data, q.error, enabled, supplierType, key]);
}

const selectClass = 'h-11 w-full bg-card md:h-9';

/**
 * Editable proposal lines: (MCN) KOL → channel assigned to that KOL, deliverable type, quantity.
 * An independent KOL only picks its own channels.
 */
export function ItemsEditor({
  supplierType,
  sources,
  platforms,
  rows,
  errors,
  onChange,
  idPrefix,
}: {
  supplierType: SupplierType;
  sources: ProposalSources;
  platforms: Platform[];
  rows: ItemDraft[];
  /** Shown after a submit attempt. */
  errors?: ItemErrors[];
  onChange(rows: ItemDraft[]): void;
  idPrefix: string;
}) {
  const isMcn = supplierType === 'MCN';
  const pickableKols = sources.kols.filter((k) => sources.channelsFor(k.kolAccountId).length > 0);
  const ownChannels = sources.channelsFor();
  const platformText = platforms.map(platformName).join(', ');

  const update = (key: string, patch: Partial<ItemDraft>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: string) => onChange(rows.filter((r) => r.key !== key));
  const add = () =>
    onChange([
      ...rows,
      {
        key: newRowKey(),
        channelId: isMcn ? '' : (ownChannels[0]?.id ?? ''),
        deliverableType: rows[rows.length - 1]?.deliverableType ?? 'VIDEO',
        quantity: '1',
      },
    ]);

  if (sources.loading) {
    return <p className="text-sm text-muted-foreground">Đang tải KOL và kênh…</p>;
  }
  if (sources.error) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-destructive/40 p-3 text-sm">
        <span className="text-destructive">Không tải được KOL và kênh.</span>
        <Button type="button" variant="outline" className="h-11 md:h-8" onClick={sources.reload}>
          Thử lại
        </Button>
      </div>
    );
  }
  if (isMcn && pickableKols.length === 0) {
    return (
      <div className="space-y-2 rounded-[8px] border border-dashed border-border p-4 text-sm">
        <p className="font-medium text-foreground">Chưa có KOL nào có kênh phù hợp</p>
        <p className="text-muted-foreground">
          Cần kênh {platformText} đã xác thực, đang hoạt động và đã gán cho KOL.{' '}
          <Link to={MCN_KOLS_PATH} className="font-medium text-primary underline-offset-4 hover:underline">
            Gán kênh ở Quản lý KOL
          </Link>
        </p>
      </div>
    );
  }
  if (!isMcn && ownChannels.length === 0) {
    return (
      <div className="space-y-2 rounded-[8px] border border-dashed border-border p-4 text-sm">
        <p className="font-medium text-foreground">Bạn chưa có kênh phù hợp</p>
        <p className="text-muted-foreground">
          Cần kênh {platformText} đã xác thực và đang hoạt động.{' '}
          <Link to="/ho-so-kol/kenh" className="font-medium text-primary underline-offset-4 hover:underline">
            Quản lý kênh
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {rows.map((r, i) => {
          const err = errors?.[i] ?? {};
          const channels = isMcn ? (r.kolAccountId ? sources.channelsFor(r.kolAccountId) : []) : ownChannels;
          // Keep a channel that is no longer eligible visible so the service error (4809) makes sense.
          const id = `${idPrefix}-${r.key}`;
          // Content types follow the channel's platform (TikTok: Video / Nhật ký; YouTube: Video / Shorts / Livestream…).
          const platform = channels.find((c) => c.id === r.channelId)?.platform;
          const types = platform ? PLATFORM_DELIVERABLES[platform] : DELIVERABLE_TYPES.map((d) => d.key);
          return (
            <li key={r.key} className="space-y-3 rounded-[8px] border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Hạng mục {i + 1}</p>
                {rows.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 text-muted-foreground hover:text-destructive md:size-8"
                    aria-label={`Xoá hạng mục ${i + 1}`}
                    onClick={() => remove(r.key)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                )}
              </div>
              <div className="grid gap-3 @md:grid-cols-2">
                {isMcn && (
                  <div className="space-y-1.5 @md:col-span-2">
                    <Label htmlFor={`${id}-kol`}>KOL</Label>
                    <Select
                      value={r.kolAccountId ?? ''}
                      onValueChange={(v) => {
                        const ch = sources.channelsFor(v)[0];
                        update(r.key, { kolAccountId: v, channelId: ch?.id ?? '', deliverableType: fitType(r.deliverableType, ch?.platform) });
                      }}
                    >
                      <SelectTrigger id={`${id}-kol`} className={selectClass} aria-invalid={!!err.kol}>
                        <SelectValue placeholder="Chọn KOL do MCN quản lý" />
                      </SelectTrigger>
                      <SelectContent>
                        {pickableKols.map((k) => (
                          <SelectItem key={k.kolAccountId} value={k.kolAccountId}>
                            <span className="flex min-w-0 items-center gap-2">
                              <KolAvatar name={k.displayName} src={k.avatar} className="size-6" />
                              <span className="truncate">{k.displayName}</span>
                              <span className="text-xs text-muted-foreground">{k.kolId}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {err.kol && <p className="text-xs text-destructive">{err.kol}</p>}
                  </div>
                )}
                <div className="space-y-1.5 @md:col-span-2">
                  <Label htmlFor={`${id}-channel`}>Kênh đăng</Label>
                  <Select
                    value={r.channelId}
                    onValueChange={(v) => update(r.key, { channelId: v, deliverableType: fitType(r.deliverableType, channels.find((c) => c.id === v)?.platform) })}
                    disabled={isMcn && !r.kolAccountId}
                  >
                    <SelectTrigger id={`${id}-channel`} className={selectClass} aria-invalid={!!err.channel}>
                      <SelectValue placeholder={isMcn && !r.kolAccountId ? 'Chọn KOL trước' : 'Chọn kênh'} />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex min-w-0 items-center gap-2">
                            <PlatformIcon platform={c.platform} className="size-5 rounded-md" />
                            <span className="truncate">{channelName(c.handle, c.url)}</span>
                            {c.stats && <span className="text-xs text-muted-foreground">{formatFollowers(c.stats.followers)} theo dõi</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {err.channel && <p className="text-xs text-destructive">{err.channel}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-type`}>Loại nội dung</Label>
                  <Select value={r.deliverableType} onValueChange={(v) => update(r.key, { deliverableType: v as DeliverableType })}>
                    <SelectTrigger id={`${id}-type`} className={selectClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {types.map((t) => (
                        <SelectItem key={t} value={t}>
                          {deliverableLabel(t, platform)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${id}-qty`}>Số lượng</Label>
                  <Input
                    id={`${id}-qty`}
                    inputMode="numeric"
                    value={r.quantity}
                    onChange={(e) => update(r.key, { quantity: e.target.value.replace(/[^\d]/g, '').slice(0, 3) })}
                    className={cn('h-11 bg-card md:h-9')}
                    aria-invalid={!!err.quantity}
                    aria-describedby={`${id}-qty-hint`}
                  />
                  <p id={`${id}-qty-hint`} className={cn('text-xs', err.quantity ? 'text-destructive' : 'text-muted-foreground')}>
                    {err.quantity ?? `Tối đa ${DELIVERABLE_QTY_MAX}`}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <Button type="button" variant="outline" className="h-11 w-full md:h-9" onClick={add}>
        <Plus aria-hidden />
        Thêm hạng mục
      </Button>
    </div>
  );
}
