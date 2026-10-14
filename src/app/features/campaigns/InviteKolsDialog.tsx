import { useEffect, useId, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Search, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import {
  BOOKING_NOTE_MAX,
  campaignService,
  savedListService,
  searchService,
  type CampaignView,
  type Deliverable,
  type DeliverableGroup,
  type InviteResult,
  type Platform,
  type SavedListSummary,
} from '../../services';
import { formatFollowers } from '../biz-search/format';
import { KolAvatar } from '../biz-search/KolCard';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { deliverableText, errText } from './CampaignParts';
import { groupRewardText, inviteRoutes, inviteSummary, SKIP_REASON_LABEL } from './campaignView';

export interface PickableKol {
  kolId: string;
  displayName: string;
  avatar?: string;
  platforms: Platform[];
  followers: number;
  disabled?: boolean;
}

function KolPickRow({ kol, checked, onToggle }: { kol: PickableKol; checked: boolean; onToggle(k: PickableKol, c: boolean): void }) {
  return (
    <li>
      <label
        className={cn(
          'flex min-h-14 cursor-pointer items-center gap-3 rounded-[8px] px-2 py-2 hover:bg-muted/60',
          checked && 'bg-primary/5',
          kol.disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <Checkbox checked={checked} disabled={kol.disabled} onCheckedChange={(c) => onToggle(kol, c === true)} aria-label={`Chọn ${kol.displayName}`} />
        <KolAvatar name={kol.displayName} src={kol.avatar} className="size-9" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{kol.displayName}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {kol.kolId}
            {kol.disabled ? ' · hồ sơ không còn hiển thị' : ` · ${formatFollowers(kol.followers)} theo dõi`}
          </span>
        </span>
        <span className="hidden shrink-0 items-center gap-1 sm:flex">
          {kol.platforms.map((p) => (
            <PlatformIcon key={p} platform={p} className="size-4" />
          ))}
        </span>
      </label>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2 p-1" aria-busy="true" aria-label="Đang tải">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function SavedSource({ selected, onToggle, onToggleMany }: { selected: Map<string, string>; onToggle(k: PickableKol, c: boolean): void; onToggleMany(ks: PickableKol[], c: boolean): void }) {
  const [lists, setLists] = useState<SavedListSummary[] | null>(null);
  const [listId, setListId] = useState<string | null>(null);
  const [rows, setRows] = useState<PickableKol[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    savedListService
      .listLists()
      .then((l) => {
        if (!alive) return;
        setLists(l);
        setListId((cur) => cur ?? l.find((x) => x.count > 0)?.id ?? l[0]?.id ?? null);
      })
      .catch((e) => alive && setError(errText(e)));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!listId) return;
    let alive = true;
    setRows(null);
    savedListService
      .getList(listId)
      .then(
        (d) =>
          alive &&
          setRows(
            d.rows.map((r) => ({
              kolId: r.kolId,
              displayName: r.displayName,
              avatar: r.avatar,
              platforms: r.platforms,
              followers: r.totalFollowers,
              disabled: r.status === 'UNAVAILABLE',
            })),
          ),
      )
      .catch((e) => alive && setError(errText(e)));
    return () => {
      alive = false;
    };
  }, [listId]);

  if (error) return <p className="p-2 text-sm text-destructive">{error}</p>;
  if (!lists) return <ListSkeleton />;
  if (lists.length === 0) return <p className="p-2 text-sm text-muted-foreground">Bạn chưa có danh sách đã lưu. Dùng thẻ “Tìm KOL” để tìm theo tên hoặc KOL ID.</p>;
  const pickable = (rows ?? []).filter((r) => !r.disabled);
  const allOn = pickable.length > 0 && pickable.every((r) => selected.has(r.kolId));
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={listId ?? undefined} onValueChange={setListId}>
          <SelectTrigger aria-label="Chọn danh sách đã lưu" className="h-11 min-w-0 flex-1 bg-card md:h-10">
            <SelectValue placeholder="Chọn danh sách" />
          </SelectTrigger>
          <SelectContent>
            {lists.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name} ({l.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pickable.length > 0 && (
          <Button type="button" variant="outline" className="h-11 md:h-10" onClick={() => onToggleMany(pickable, !allOn)}>
            {allOn ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </Button>
        )}
      </div>
      {!rows ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <p className="p-2 text-sm text-muted-foreground">Danh sách này chưa có KOL.</p>
      ) : (
        <ul className="space-y-0.5" aria-label="KOL trong danh sách">
          {rows.map((k) => (
            <KolPickRow key={k.kolId} kol={k} checked={selected.has(k.kolId)} onToggle={onToggle} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SearchSource({ selected, onToggle }: { selected: Map<string, string>; onToggle(k: PickableKol, c: boolean): void }) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<PickableKol[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const kw = text.trim();
    if (!kw) {
      setRows(null);
      return;
    }
    let alive = true;
    const t = window.setTimeout(() => {
      setLoading(true);
      searchService
        .search({ keyword: kw, page: 1 })
        .then((r) => {
          if (!alive) return;
          setTotal(r.total);
          setRows(r.items.map((k) => ({ kolId: k.kolId, displayName: k.displayName, avatar: k.avatar, platforms: k.platforms, followers: k.totalFollowers })));
        })
        .catch(() => alive && setRows([]))
        .finally(() => alive && setLoading(false));
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [text]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tên KOL, @nickname hoặc KOL ID"
          aria-label="Tìm KOL theo tên, nickname hoặc KOL ID"
          className="h-11 bg-card pl-9 md:h-10"
        />
      </div>
      {loading && !rows ? (
        <ListSkeleton />
      ) : rows === null ? (
        <p className="p-2 text-sm text-muted-foreground">Nhập tên hoặc KOL ID (VD: KOL-2026-0012) để tìm KOL có kênh đã xác thực.</p>
      ) : rows.length === 0 ? (
        <p className="p-2 text-sm text-muted-foreground">Không tìm thấy KOL phù hợp.</p>
      ) : (
        <>
          <ul className={cn('space-y-0.5', loading && 'opacity-60')} aria-label="Kết quả tìm KOL" aria-busy={loading}>
            {rows.map((k) => (
              <KolPickRow key={k.kolId} kol={k} checked={selected.has(k.kolId)} onToggle={onToggle} />
            ))}
          </ul>
          {total > rows.length && <p className="px-2 text-xs text-muted-foreground">Hiện {rows.length}/{total} kết quả. Nhập cụ thể hơn để thu hẹp.</p>}
        </>
      )}
    </div>
  );
}

/** Result of an invite: counts, where each KOL was routed (MCN or direct) and skipped KOLs with reasons. */
export function InviteResultView({ result, kolIds, names }: { result: InviteResult; kolIds: string[]; names: Map<string, string> }) {
  const routes = inviteRoutes(result, kolIds);
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-[8px] border border-chart-4/40 bg-chart-4/10 p-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-chart-4" aria-hidden />
        <p className="text-sm font-medium text-foreground">{inviteSummary(result)}</p>
      </div>
      {routes.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Lời mời đã gửi</h3>
          <ul className="space-y-2">
            {routes.map((r) => (
              <li key={r.bookingId} className="rounded-[8px] border border-border p-3 text-sm">
                <p className="font-medium text-foreground">
                  {r.supplierType === 'MCN' ? `Qua MCN ${r.supplierName}` : `Trực tiếp tới ${r.supplierName}`}
                  <span className="font-normal text-muted-foreground"> · {r.created ? 'lời mời mới' : 'thêm vào lời mời đang chờ'}</span>
                </p>
                <p className="mt-0.5 text-muted-foreground">{r.kols.join(', ')}</p>
              </li>
            ))}
          </ul>
          {routes.some((r) => r.supplierType === 'MCN') && (
            <p className="text-xs text-muted-foreground">KOL do MCN quản lý được gửi tới MCN đó; MCN chọn kênh đăng rồi nhận hoặc từ chối.</p>
          )}
        </section>
      )}
      {result.skipped.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Bỏ qua ({result.skipped.length})</h3>
          <ul className="space-y-1 text-sm">
            {result.skipped.map((s) => (
              <li key={s.kolId} className="flex flex-wrap gap-x-2">
                <span className="font-medium text-foreground">{names.get(s.kolId) ?? s.kolId}</span>
                <span className="text-muted-foreground">{SKIP_REASON_LABEL[s.reason]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Deliverable + its group's fixed reward (read-only) + note, shared by both invite dialogs. */
export function InviteOptionsFields({
  deliverables,
  groups,
  deliverable,
  onDeliverable,
  note,
  onNote,
}: {
  deliverables: Deliverable[];
  groups: DeliverableGroup[];
  deliverable: string;
  onDeliverable(v: string): void;
  note: string;
  onNote(v: string): void;
}) {
  const id = useId();
  const group = groups.find((g) => g.platform === deliverables[Number(deliverable)]?.platform);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`${id}-d`}>Hạng mục</Label>
        <Select value={deliverable} onValueChange={onDeliverable} disabled={deliverables.length === 0}>
          <SelectTrigger id={`${id}-d`} className="h-11 w-full bg-card md:h-10">
            <SelectValue placeholder="Chiến dịch chưa có hạng mục" />
          </SelectTrigger>
          <SelectContent>
            {deliverables.map((d, i) => (
              <SelectItem key={i} value={String(i)}>
                {deliverableText(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">Thù lao cố định</p>
        <p className="text-base font-semibold text-foreground tabular-nums">{group ? groupRewardText(group) : 'Chưa thiết lập'}</p>
        <p className="text-xs text-muted-foreground">Theo nhóm đầu việc của chiến dịch. KOL/MCN nhận hoặc từ chối, không trả giá.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-n`}>
          Lời nhắn <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
        </Label>
        <Textarea id={`${id}-n`} rows={3} maxLength={BOOKING_NOTE_MAX} value={note} onChange={(e) => onNote(e.target.value)} />
      </div>
    </div>
  );
}

/** Deliverable option for the service from the chosen index (undefined = campaign default). */
export function deliverableOption(deliverables: Deliverable[], index: string) {
  const d = deliverables[Number(index)];
  return d ? { type: d.type, platform: d.platform, quantity: d.quantity } : undefined;
}

/**
 * "Mời KOL" from a campaign: pick KOLs from saved lists and/or search (name / KOL ID), then the deliverable
 * (its group's fixed reward applies) and note → campaignService.inviteKols. Shows the routing summary afterwards.
 */
export function InviteKolsDialog({ campaign, open, onOpenChange }: { campaign: CampaignView; open: boolean; onOpenChange(open: boolean): void }) {
  const [selected, setSelected] = useState<Map<string, string>>(new Map());
  const [deliverable, setDeliverable] = useState('0');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ result: InviteResult; kolIds: string[]; names: Map<string, string> } | null>(null);

  useEffect(() => {
    if (open) {
      setSelected(new Map());
      setDeliverable('0');
      setNote('');
      setError(null);
      setResult(null);
    }
  }, [open]);

  const toggle = (k: PickableKol, on: boolean) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (on) next.set(k.kolId, k.displayName);
      else next.delete(k.kolId);
      return next;
    });
  const toggleMany = (ks: PickableKol[], on: boolean) =>
    setSelected((prev) => {
      const next = new Map(prev);
      for (const k of ks) {
        if (on) next.set(k.kolId, k.displayName);
        else next.delete(k.kolId);
      }
      return next;
    });

  const chips = useMemo(() => [...selected.entries()], [selected]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const kolIds = [...selected.keys()];
    try {
      const r = await campaignService.inviteKols(campaign.id, kolIds, {
        note,
        deliverable: deliverableOption(campaign.deliverables, deliverable),
      });
      setResult({ result: r, kolIds, names: new Map(selected) });
      toast.success(inviteSummary(r));
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border p-4 pr-12 text-left md:p-5">
          <DialogTitle>{result ? 'Kết quả mời KOL' : 'Mời KOL vào chiến dịch'}</DialogTitle>
          <DialogDescription className="truncate">{campaign.name}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 md:p-5">
          {result ? (
            <InviteResultView {...result} />
          ) : (
            <>
              <Tabs defaultValue="saved" className="flex flex-col gap-3">
                <TabsList className="h-auto w-full">
                  <TabsTrigger value="saved" className="h-11 md:h-8">
                    Danh sách đã lưu
                  </TabsTrigger>
                  <TabsTrigger value="search" className="h-11 md:h-8">
                    Tìm KOL
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="saved" className="mt-0 max-h-72 overflow-y-auto">
                  <SavedSource selected={selected} onToggle={toggle} onToggleMany={toggleMany} />
                </TabsContent>
                <TabsContent value="search" className="mt-0 max-h-72 overflow-y-auto">
                  <SearchSource selected={selected} onToggle={toggle} />
                </TabsContent>
              </Tabs>

              <section className="space-y-2" aria-label="KOL đã chọn">
                <p className="text-sm font-medium text-foreground">Đã chọn {selected.size} KOL</p>
                {chips.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {chips.map(([kolId, name]) => (
                      <li key={kolId}>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pr-0.5 pl-2.5 text-xs font-medium text-primary">
                          {name}
                          <button
                            type="button"
                            onClick={() => toggle({ kolId, displayName: name, platforms: [], followers: 0 }, false)}
                            className="flex size-7 items-center justify-center rounded-full hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Bỏ chọn ${name}`}
                          >
                            <X className="size-3.5" aria-hidden />
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <InviteOptionsFields
                deliverables={campaign.deliverables}
                groups={campaign.groups ?? []}
                deliverable={deliverable}
                onDeliverable={setDeliverable}
                note={note}
                onNote={setNote}
              />

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 border-t border-border p-4 md:p-5">
          {result ? (
            <>
              <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => {
                  setResult(null);
                  setSelected(new Map());
                }}>
                Mời thêm
              </Button>
              <Button type="button" className="h-11 md:h-9" onClick={() => onOpenChange(false)}>
                Xong
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" className="h-11 md:h-9" disabled={busy} onClick={() => onOpenChange(false)}>
                Huỷ
              </Button>
              <Button type="button" className="h-11 md:h-9" disabled={busy || selected.size === 0} onClick={() => void submit()}>
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                Gửi lời mời{selected.size ? ` (${selected.size})` : ''}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
