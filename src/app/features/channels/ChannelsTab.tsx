import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { AlertCircle, Plus, RotateCcw, SearchX } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { channelService, PLATFORMS, type Channel, type ProfileStatus } from '../../services';
import type { FilterChip } from '../filters/ActiveFilterChips';
import { FilterBar } from '../filters/FilterBar';
import { FilterSelect } from '../filters/FilterSelect';
import { PlatformSelect } from '../filters/PlatformSelect';
import { SortSelect } from '../filters/SortSelect';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ChannelFormSheet } from './ChannelFormSheet';
import { ChannelListRow, ChannelListRowSkeleton } from './ChannelListRow';
import {
  applyChannelPatch,
  CHANNEL_ACTIVE_OPTIONS,
  CHANNEL_SORT_OPTIONS,
  CHANNEL_STATUS_OPTIONS,
  channelFilterCount,
  channelStatusTabs,
  clearChannelFilters,
  countByStatus,
  filterChannels,
  hasChannelFilters,
  mergeChannelParams,
  parseChannelParams,
  sortChannels,
  statusOnlyQuery,
  statusTabQuery,
  type ChannelActiveFilter,
  type ChannelQuery,
  type ChannelStatusFilter,
} from './channelQuery';


function chipsOf(q: ChannelQuery, onChange: (patch: Partial<ChannelQuery>) => void): FilterChip[] {
  const chips: FilterChip[] = [];
  if (q.status) {
    const label = CHANNEL_STATUS_OPTIONS.find((o) => o.key === q.status)?.label ?? q.status;
    chips.push({ key: 'status', label, remove: () => onChange({ status: undefined }) });
  }
  for (const p of PLATFORMS.filter((x) => q.platforms?.includes(x.key))) {
    chips.push({
      key: `platform-${p.key}`,
      label: p.label,
      remove: () => onChange({ platforms: (q.platforms ?? []).filter((k) => k !== p.key) }),
    });
  }
  if (q.active) {
    const label = CHANNEL_ACTIVE_OPTIONS.find((o) => o.key === q.active)?.label ?? q.active;
    chips.push({ key: 'active', label, remove: () => onChange({ active: undefined }) });
  }
  return chips;
}

/** 'full' = search-style filter bar (KOL); 'status' = only the approval-status tabs (MCN). */
export type ChannelFilterMode = 'full' | 'status';

/**
 * SCR-06 — "Quản lý kênh" for KOL and MCN: filters with state in the URL (full filter bar, or
 * status tabs only), list rows, active switch and add/edit sheet. There is no delete (BR-23).
 */
export function ChannelsTab({
  accountId,
  profileStatus,
  openAddRequest = false,
  onOpenAddConsumed,
  filterMode = 'full',
}: {
  accountId: string;
  filterMode?: ChannelFilterMode;
  profileStatus: ProfileStatus;
  /** When true, open the add-channel sheet once, then call onOpenAddConsumed (e.g. header "Thêm kênh"). */
  openAddRequest?: boolean;
  onOpenAddConsumed?(): void;
}) {
  const data = useLiveQuery(() => channelService.list(accountId), [accountId]);
  const [searchParams, setSearchParams] = useSearchParams();
  const paramsKey = searchParams.toString();
  const statusMode = filterMode === 'status';
  const query = useMemo(() => {
    const parsed = parseChannelParams(new URLSearchParams(paramsKey));
    return statusMode ? statusOnlyQuery(parsed) : parsed;
  }, [paramsKey, statusMode]);
  const [sheet, setSheet] = useState<{ open: boolean; channel?: Channel }>({ open: false });

  const channels = data.data;
  // Re-read the clock whenever the list changes, so "Hết hạn dấu" follows the data.
  const now = useMemo(() => Date.now(), [channels]);
  const counts = useMemo(() => countByStatus(channels ?? [], now), [channels, now]);
  const statusTabs = useMemo(() => channelStatusTabs(channels ?? [], now), [channels, now]);
  const shown = useMemo(
    () => sortChannels(filterChannels(channels ?? [], query, now), query.sort),
    [channels, query, now],
  );

  const writeQuery = useCallback(
    (next: ChannelQuery, replace = false) => setSearchParams((prev) => mergeChannelParams(prev, next), { replace }),
    [setSearchParams],
  );
  const onChange = (patch: Partial<ChannelQuery>) => writeQuery(applyChannelPatch(query, patch));
  const onClear = () => writeQuery(clearChannelFilters(query));

  const openAdd = () => setSheet({ open: true });
  useEffect(() => {
    if (!openAddRequest) return;
    setSheet({ open: true });
    onOpenAddConsumed?.();
  }, [openAddRequest, onOpenAddConsumed]);

  const active = hasChannelFilters(query);
  const total = channels?.length ?? 0;

  const filters = (triggerClass?: string) => (
    <>
      <FilterSelect<ChannelStatusFilter>
        label="Trạng thái"
        allLabel={`Tất cả trạng thái (${total})`}
        value={query.status}
        options={CHANNEL_STATUS_OPTIONS.map((o) => ({ key: o.key, label: `${o.label} (${counts[o.key]})` }))}
        onChange={(status) => onChange({ status })}
        className={triggerClass}
      />
      <PlatformSelect
        value={query.platforms ?? []}
        onChange={(platforms) => onChange({ platforms })}
        className={triggerClass}
      />
      <FilterSelect<ChannelActiveFilter>
        label="Hoạt động"
        allLabel="Tất cả kênh"
        value={query.active}
        options={CHANNEL_ACTIVE_OPTIONS}
        onChange={(a) => onChange({ active: a })}
        className={triggerClass}
      />
    </>
  );

  const item = (c: Channel) => ({
    channel: c,
    accountId,
    now,
    locked: profileStatus === 'SUBMITTED' && c.status === 'PENDING_REVIEW',
    onEdit: () => setSheet({ open: true, channel: c }),
  });

  const loading = data.loading && !channels;
  const empty = !!channels && channels.length === 0;

  let body: ReactNode;
  if (loading) {
    body = (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Đang tải kênh">
        {[0, 1, 2].map((i) => (
          <ChannelListRowSkeleton key={i} />
        ))}
      </div>
    );
  } else if (data.error && !channels) {
    body = (
      <Alert variant="destructive">
        <AlertCircle className="size-4" aria-hidden />
        <AlertDescription className="space-y-2">
          <p>Không tải được danh sách kênh.</p>
          <Button type="button" size="sm" variant="outline" onClick={data.reload}>
            <RotateCcw aria-hidden />
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else if (empty) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">Bạn chưa khai báo kênh nào.</p>
        <Button type="button" className="h-11 md:h-9" onClick={openAdd}>
          <Plus aria-hidden />
          Thêm kênh đầu tiên
        </Button>
      </div>
    );
  } else if (shown.length === 0 && statusMode) {
    body = (
      <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Không có kênh ở trạng thái này
      </p>
    );
  } else if (shown.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <SearchX className="size-6" aria-hidden />
        </div>
        <p className="font-semibold text-foreground">Không có kênh phù hợp</p>
        <p className="text-sm text-muted-foreground">Thử bỏ bớt bộ lọc hoặc đổi từ khoá.</p>
        <Button type="button" variant="outline" className="h-11" onClick={onClear}>
          Xoá bộ lọc
        </Button>
      </div>
    );
  } else {
    body = (
      <ul className="flex flex-col gap-3" aria-label="Danh sách kênh">
        {shown.map((c) => (
          <li key={c.id}>
            <ChannelListRow {...item(c)} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="@container space-y-4">
      {!empty && statusMode && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="-mx-4 min-w-0 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Tabs value={query.status ?? 'all'} onValueChange={(key) => writeQuery(statusTabQuery(key))}>
              <TabsList className="h-auto" aria-label="Lọc theo trạng thái duyệt">
                {statusTabs.map((t) => (
                  <TabsTrigger key={t.key} value={t.key} className="h-11 md:h-8">
                    {t.label} ({t.count})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
            <p className="text-sm font-medium text-foreground" aria-live="polite">
              {shown.length} kênh
            </p>
            <Button type="button" className="h-11 md:h-9" onClick={openAdd}>
              <Plus aria-hidden />
              Thêm kênh
            </Button>
          </div>
        </div>
      )}

      {!empty && !statusMode && (
        <>
          <FilterBar
            keyword={query.keyword}
            onKeywordChange={(keyword) => onChange({ keyword })}
            searchPlaceholder="Tìm theo tên kênh, @handle hoặc link"
            searchLabel="Tìm kênh theo tên kênh, @handle hoặc link"
            renderFilters={filters}
            filterGridClass="grid-cols-3"
            inlineFilterClass="@4xl:w-40"
            renderSort={(className) => (
              <SortSelect
                value={query.sort ?? 'updated'}
                options={CHANNEL_SORT_OPTIONS}
                onChange={(sort) => onChange({ sort })}
                className={className}
              />
            )}
            filterCount={channelFilterCount(query)}
            active={active}
            chips={chipsOf(query, onChange)}
            onClear={onClear}
          />

          <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
            <p className="font-medium text-foreground" aria-live="polite">
              {channels && (
                <>
                  {shown.length} kênh
                  {active && <span className="font-normal text-muted-foreground"> / {total} kênh đã khai báo</span>}
                </>
              )}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Button type="button" className="h-11 md:h-9" onClick={openAdd}>
                <Plus aria-hidden />
                Thêm kênh
              </Button>
            </div>
          </div>
        </>
      )}

      {body}

      <ChannelFormSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        accountId={accountId}
        channel={sheet.channel}
      />
    </div>
  );
}
