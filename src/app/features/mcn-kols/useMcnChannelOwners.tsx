import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeftRight, Building2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';
import { cn } from '../../components/ui/utils';
import { MCN_KOLS_PATH } from '../../auth/roles';
import { mcnKolService, type Channel, type McnKolRow } from '../../services';
import { FilterSelect } from '../filters/FilterSelect';
import { useLiveQuery } from '../shared/useLiveQuery';
import { AssignChannelDialog } from './AssignChannelDialog';
import { filterByOwner, OWN_CHANNELS_LABEL, OWNER_PARAM, ownerOf, ownerOptions, parseOwnerParam, withOwnerParam } from './channelOwner';
import { KolAvatar } from './McnKolRow';

const MENU_ITEM = 'min-h-11 md:min-h-9';
const nameOf = (c: Channel) => c.handle || c.url;

/** "KOL: Tên" with a small avatar, or "Kênh riêng MCN". */
export function ChannelOwnerTag({ owner, className }: { owner: McnKolRow | null; className?: string }) {
  if (!owner) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        <Building2 className="size-3.5 shrink-0" aria-hidden />
        {OWN_CHANNELS_LABEL}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground', className)} title={`${owner.displayName} · ${owner.kolId}`}>
      <KolAvatar name={owner.displayName} src={owner.avatar} className="size-5 [&_span]:text-[9px]" />
      <span className="truncate">
        KOL: <span className="font-medium text-foreground">{owner.displayName}</span>
      </span>
    </span>
  );
}

/**
 * MCN "Quản lý kênh" owner features, plugged into the shared ChannelsTab / ChannelRow slots:
 * `?kol=` filter (Tất cả / Kênh riêng MCN / each ACTIVE KOL), owner tag, More-menu items,
 * the "Chủ sở hữu" section of the detail sheet and the assign dialog. No-ops when `enabled` is false (KOL).
 */
export function useMcnChannelOwners(accountId: string, enabled: boolean) {
  const q = useLiveQuery(
    () => (enabled ? mcnKolService.listKols(accountId) : Promise.resolve([] as McnKolRow[])),
    [accountId, enabled],
  );
  const kols = useMemo(() => (q.data ?? []).filter((k) => k.status === 'ACTIVE'), [q.data]);
  const [params, setParams] = useSearchParams();
  const owner = enabled ? parseOwnerParam(params.get(OWNER_PARAM)) : undefined;
  const setOwner = useCallback(
    (o: string | undefined) => setParams((prev) => withOwnerParam(prev, o)),
    [setParams],
  );
  const [target, setTarget] = useState<Channel | null>(null);

  const assign = async (c: Channel, kolAccountId: string | null) => {
    await mcnKolService.assignChannel(accountId, c.id, kolAccountId);
  };

  const unassign = async (c: Channel) => {
    const prev = c.assignedKolAccountId;
    try {
      await assign(c, null);
      toast.success(`Đã chuyển ${nameOf(c)} về ${OWN_CHANNELS_LABEL}`, {
        action: prev ? { label: 'Hoàn tác', onClick: () => void assign(c, prev).catch(() => undefined) } : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  const save = async (kolAccountId: string | null) => {
    if (!target) return;
    await assign(target, kolAccountId);
    const k = kols.find((x) => x.kolAccountId === kolAccountId);
    toast.success(k ? `Đã gán ${nameOf(target)} cho ${k.displayName}` : `Đã chuyển ${nameOf(target)} về ${OWN_CHANNELS_LABEL}`);
  };

  const ownerSelect = (channels: Channel[], className?: string): ReactNode =>
    enabled && (
      <FilterSelect<string>
        label="Chủ sở hữu"
        allLabel={`Tất cả chủ sở hữu (${channels.length})`}
        value={owner}
        options={ownerOptions(channels, kols)}
        onChange={setOwner}
        className={className}
      />
    );

  const menuItems = (c: Channel): ReactNode => {
    if (!enabled) return null;
    const assigned = !!ownerOf(c, kols);
    return (
      <>
        <DropdownMenuSeparator />
        <DropdownMenuItem className={MENU_ITEM} onSelect={() => setTarget(c)}>
          {assigned ? <ArrowLeftRight aria-hidden /> : <UserPlus aria-hidden />}
          {assigned ? 'Đổi KOL được gán' : 'Gán cho KOL'}
        </DropdownMenuItem>
        {assigned && (
          <DropdownMenuItem className={MENU_ITEM} onSelect={() => void unassign(c)}>
            <Building2 aria-hidden />
            Chuyển về {OWN_CHANNELS_LABEL}
          </DropdownMenuItem>
        )}
      </>
    );
  };

  const detailSection = (c: Channel): ReactNode => {
    if (!enabled) return null;
    const o = ownerOf(c, kols);
    return (
      <section className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Chủ sở hữu</h3>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {o ? (
              <KolAvatar name={o.displayName} src={o.avatar} className="size-12" />
            ) : (
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                <Building2 className="size-5" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{o ? o.displayName : OWN_CHANNELS_LABEL}</p>
              <p className="truncate text-xs text-muted-foreground">
                {o ? `KOL ID: ${o.kolId} · KOL do MCN quản lý` : 'Kênh do MCN phát triển, chưa gán cho KOL nào'}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {o && (
              <Button type="button" variant="ghost" className="h-11 sm:h-9" onClick={() => void unassign(c)}>
                <Building2 aria-hidden />
                Bỏ gán
              </Button>
            )}
            <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={() => setTarget(c)}>
              {o ? <ArrowLeftRight aria-hidden /> : <UserPlus aria-hidden />}
              {o ? 'Đổi KOL' : 'Gán cho KOL'}
            </Button>
          </div>
        </div>
        {kols.length === 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" aria-hidden />
            MCN chưa quản lý KOL nào.{' '}
            <Link to={MCN_KOLS_PATH} className="font-medium text-primary underline-offset-4 hover:underline">
              Quản lý KOL
            </Link>
          </p>
        )}
      </section>
    );
  };

  const dialog: ReactNode = enabled && (
    <AssignChannelDialog
      open={target !== null}
      onOpenChange={(o) => !o && setTarget(null)}
      channelName={target ? nameOf(target) : ''}
      kols={kols}
      currentKolAccountId={target ? ownerOf(target, kols)?.kolAccountId : undefined}
      onSave={save}
    />
  );

  return {
    enabled,
    kols,
    owner,
    setOwner,
    filter: <T extends Channel>(channels: T[]) => (enabled ? filterByOwner(channels, owner, kols) : channels),
    ownerOf: (c: Channel) => ownerOf(c, kols),
    ownerSelect,
    tag: (c: Channel): ReactNode => enabled && <ChannelOwnerTag owner={ownerOf(c, kols)} />,
    menuItems,
    detailSection,
    dialog,
  };
}
