import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { Eye, Link2, Pencil, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { DropdownMenuItem } from '../../components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  CHANNEL_PAGE_SIZE,
  channelBadge,
  channelService,
  PLATFORMS,
  type ActivityField,
  type Channel,
  type ProfileStatus,
} from '../../services';
import type { FilterChip } from '../filters/ActiveFilterChips';
import { FilterBar } from '../filters/FilterBar';
import { FilterSelect } from '../filters/FilterSelect';
import { PlatformSelect } from '../filters/PlatformSelect';
import { SortSelect } from '../filters/SortSelect';
import { ChannelStatusBadge } from '../shared/StatusBadges';
import { useLiveQuery } from '../shared/useLiveQuery';
import { useChannelParam } from './ChannelDetailSheet';
import { ChannelFormSheet } from './ChannelFormSheet';
import {
  ChannelCountLine,
  ChannelList,
  ChannelListEmpty,
  ChannelListError,
  ChannelListSkeleton,
  ClearFiltersButton,
} from './ChannelListStates';
import { ActiveSwitch, NeedsFixCallout } from './ChannelParts';
import { ChannelRow, ROW_MENU_ITEM } from './ChannelRow';
import { OwnerChannelSheet } from './OwnerChannelSheet';
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
 * SCR-06 — "Quản lý kênh" for KOL and MCN: same rows, filters, states and "Chi tiết kênh" sheet as
 * the Brand "Danh sách kênh", plus the owner actions: add/edit sheet, active switch, review status
 * (full filter bar, or status tabs only for MCN). There is no delete (BR-23).
 */
export function ChannelsTab({
  accountId,
  profileStatus,
  fields = [],
  region,
  openAddRequest = false,
  onOpenAddConsumed,
  filterMode = 'full',
}: {
  accountId: string;
  filterMode?: ChannelFilterMode;
  profileStatus: ProfileStatus;
  /** Owner's public "Lĩnh vực hoạt động" and region, shown on every row like on the Brand side. */
  fields?: ActivityField[];
  region?: string;
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
  const detail = useChannelParam();
  const [page, setPage] = useState(1);
  // Back to page 1 when filters change (not when only `?kenh=` changes).
  const queryKey = JSON.stringify(query);
  useEffect(() => setPage(1), [queryKey]);

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

  const isLocked = (c: Channel) => profileStatus === 'SUBMITTED' && c.status === 'PENDING_REVIEW';
  const openEdit = (c: Channel) => setSheet({ open: true, channel: c });
  const editFromDetail = (c: Channel) => {
    detail.closeChannel();
    openEdit(c);
  };

  const pageCount = Math.max(1, Math.ceil(shown.length / CHANNEL_PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const paged = shown.slice((current - 1) * CHANNEL_PAGE_SIZE, current * CHANNEL_PAGE_SIZE);
  const onPage = (p: number) => {
    setPage(p);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const row = (c: Channel) => {
    const locked = isLocked(c);
    return (
      <ChannelRow
        platform={c.platform}
        handle={c.handle}
        url={c.url}
        verifiedUntil={channelBadge(c, now) === 'VERIFIED' ? c.badgeExpiresAt : undefined}
        subline={<ChannelStatusBadge channel={c} now={now} />}
        fields={fields}
        region={region}
        followers={c.stats?.followers}
        trailing={<ActiveSwitch channel={c} accountId={accountId} />}
        onOpen={() => detail.openChannel(c.id)}
        footer={
          c.status === 'NEEDS_FIX' && (
            <NeedsFixCallout
              channel={c}
              action={
                <Button type="button" size="sm" className="h-11 md:h-8" onClick={() => openEdit(c)}>
                  Sửa
                </Button>
              }
            />
          )
        }
        menu={
          <>
            <DropdownMenuItem className={ROW_MENU_ITEM} onSelect={() => detail.openChannel(c.id)}>
              <Eye aria-hidden />
              Xem chi tiết kênh
            </DropdownMenuItem>
            <DropdownMenuItem className={ROW_MENU_ITEM} disabled={locked} onSelect={() => openEdit(c)}>
              <Pencil aria-hidden />
              Sửa kênh
              {locked && <span className="ml-auto text-xs text-muted-foreground">Đang xét duyệt</span>}
            </DropdownMenuItem>
          </>
        }
      />
    );
  };

  const loading = data.loading && !channels;
  const empty = !!channels && channels.length === 0;
  const addButton = (
    <Button type="button" className="h-11 md:h-9" onClick={openAdd}>
      <Plus aria-hidden />
      Thêm kênh
    </Button>
  );

  let body: ReactNode;
  if (loading) {
    body = <ChannelListSkeleton />;
  } else if (data.error && !channels) {
    body = <ChannelListError message="Không tải được danh sách kênh." onRetry={data.reload} />;
  } else if (empty) {
    body = (
      <ChannelListEmpty
        icon={Link2}
        title="Bạn chưa khai báo kênh nào"
        description="Thêm kênh để gửi xét duyệt và nhận dấu xác thực."
        action={
          <Button type="button" className="h-11 md:h-9" onClick={openAdd}>
            <Plus aria-hidden />
            Thêm kênh đầu tiên
          </Button>
        }
      />
    );
  } else if (shown.length === 0 && statusMode) {
    body = <ChannelListEmpty title="Không có kênh ở trạng thái này" />;
  } else if (shown.length === 0) {
    body = (
      <ChannelListEmpty
        title="Không có kênh phù hợp"
        description="Thử bỏ bớt bộ lọc hoặc đổi từ khoá."
        action={<ClearFiltersButton onClear={onClear} />}
      />
    );
  } else {
    body = (
      <ChannelList label="Danh sách kênh" page={current} pageCount={pageCount} onPage={onPage}>
        {paged.map((c) => (
          <li key={c.id}>{row(c)}</li>
        ))}
      </ChannelList>
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
          <div className="shrink-0">
            <ChannelCountLine count={shown.length} actions={addButton} />
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

          <ChannelCountLine
            count={channels ? shown.length : undefined}
            extra={active ? `/ ${total} kênh đã khai báo` : undefined}
            actions={addButton}
          />
        </>
      )}

      {body}

      <OwnerChannelSheet
        channelId={detail.channelId}
        channels={channels}
        loading={data.loading}
        accountId={accountId}
        now={now}
        isLocked={isLocked}
        onClose={detail.closeChannel}
        onEdit={editFromDetail}
      />
      <ChannelFormSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        accountId={accountId}
        channel={sheet.channel}
      />
    </div>
  );
}
