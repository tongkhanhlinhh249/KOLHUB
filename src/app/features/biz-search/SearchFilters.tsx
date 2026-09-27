import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpDown, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Input } from '../../components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../components/ui/sheet';
import { cn } from '../../components/ui/utils';
import {
  KOL_CATEGORIES,
  KOL_REGIONS,
  KOL_SCALES,
  PLATFORMS,
  type KolCategory,
  type KolRegion,
  type KolScale,
  type KolSearchQuery,
  type Platform,
  type SearchSort,
} from '../../services';
import { PlatformIcon } from './PlatformIcon';
import { activeFilterCount, hasActiveFilters } from './searchParams';

const ALL = '__all';

const SORT_OPTIONS: { key: SearchSort; label: string }[] = [
  { key: 'relevance', label: 'Liên quan' },
  { key: 'followers', label: 'Người theo dõi cao nhất' },
  { key: 'newest', label: 'Mới xác thực' },
];

/** Shared look for every filter trigger; active filters get a primary tint so state is visible at a glance. */
const triggerBase =
  'h-10 w-full gap-2 bg-card text-sm font-normal data-[placeholder]:text-foreground';
const triggerActive = 'border-primary/60 bg-primary/5 text-primary';

interface SearchFiltersProps {
  query: KolSearchQuery;
  onChange(patch: Partial<KolSearchQuery>): void;
  onClear(): void;
}

/**
 * Unset → the trigger shows the filter name ("Lĩnh vực") as placeholder;
 * set → it shows the chosen value. "Tất cả …" in the list clears the filter.
 */
function FilterSelect<T extends string>({
  label,
  allLabel,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  allLabel: string;
  value: T | undefined;
  options: { key: T; label: string }[];
  onChange(v: T | undefined): void;
  className?: string;
}) {
  return (
    <Select value={value ?? ''} onValueChange={(v) => onChange(v === ALL ? undefined : (v as T))}>
      <SelectTrigger aria-label={label} className={cn(triggerBase, value && triggerActive, className)}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.key} value={o.key}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Multi-select for "Nền tảng có dấu" folded into one dropdown so the bar fits on one line. */
function PlatformSelect({
  value,
  onChange,
  className,
}: {
  value: Platform[];
  onChange(v: Platform[]): void;
  className?: string;
}) {
  const titleId = useId();
  const toggle = (p: Platform, on: boolean) =>
    onChange(on ? PLATFORMS.map((x) => x.key).filter((k) => k === p || value.includes(k)) : value.filter((k) => k !== p));
  const selected = PLATFORMS.filter((p) => value.includes(p.key));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={selected.length ? `Nền tảng có dấu: ${selected.map((p) => p.label).join(', ')}` : 'Nền tảng có dấu'}
          className={cn(
            'h-10 w-full justify-between gap-2 border-border bg-card px-3 font-normal shadow-none hover:bg-card',
            selected.length > 0 && triggerActive,
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {selected.length === 0 && <span className="truncate">Nền tảng</span>}
            {selected.length === 1 && (
              <>
                <PlatformIcon platform={selected[0].key} />
                <span className="truncate">{selected[0].label}</span>
              </>
            )}
            {selected.length > 1 && (
              <>
                <span className="flex -space-x-1" aria-hidden>
                  {selected.map((p) => (
                    <span key={p.key} className="rounded-full bg-card ring-2 ring-card">
                      <PlatformIcon platform={p.key} />
                    </span>
                  ))}
                </span>
              </>
            )}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-2">
        <p id={titleId} className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">
          Nền tảng có dấu xác thực
        </p>
        <div role="group" aria-labelledby={titleId} className="space-y-0.5">
          {PLATFORMS.map((p) => {
            const id = `${titleId}-${p.key}`;
            return (
              <label
                key={p.key}
                htmlFor={id}
                className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm hover:bg-muted"
              >
                <Checkbox
                  id={id}
                  checked={value.includes(p.key)}
                  onCheckedChange={(c) => toggle(p.key, c === true)}
                />
                <PlatformIcon platform={p.key} />
                {p.label}
              </label>
            );
          })}
        </div>
        {value.length > 0 && (
          <Button type="button" variant="ghost" size="sm" className="mt-1 w-full" onClick={() => onChange([])}>
            Bỏ chọn nền tảng
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SortSelect({ value, onChange, className }: { value: SearchSort; onChange(v: SearchSort): void; className?: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SearchSort)}>
      <SelectTrigger aria-label="Sắp xếp" className={cn(triggerBase, className)}>
        {/* div, not span: SelectTrigger line-clamps direct span children */}
        <div className="flex min-w-0 items-center gap-2">
          <ArrowUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">
            <SelectValue />
          </span>
        </div>
      </SelectTrigger>
      <SelectContent align="end">
        {SORT_OPTIONS.map((o) => (
          <SelectItem key={o.key} value={o.key}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Removable chips for every active filter, so state stays visible after the dropdowns close. */
function ActiveFilterChips({
  query,
  onChange,
  onClear,
}: {
  query: KolSearchQuery;
  onChange(patch: Partial<KolSearchQuery>): void;
  onClear(): void;
}) {
  const chips: { key: string; label: string; remove(): void }[] = [];
  if (query.category) chips.push({ key: 'category', label: query.category, remove: () => onChange({ category: undefined }) });
  if (query.region) chips.push({ key: 'region', label: query.region, remove: () => onChange({ region: undefined }) });
  if (query.scale) {
    const s = KOL_SCALES.find((x) => x.key === query.scale);
    chips.push({ key: 'scale', label: s?.label ?? query.scale, remove: () => onChange({ scale: undefined }) });
  }
  for (const p of PLATFORMS.filter((x) => query.platforms?.includes(x.key))) {
    chips.push({
      key: `platform-${p.key}`,
      label: p.label,
      remove: () => onChange({ platforms: (query.platforms ?? []).filter((k) => k !== p.key) }),
    });
  }
  if (chips.length === 0 && !hasActiveFilters(query)) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Bộ lọc đang áp dụng">
      {chips.map((c) => (
        <Badge key={c.key} variant="secondary" className="h-8 gap-1 rounded-full py-0 pr-1 pl-3 text-xs font-medium">
          {c.label}
          <button
            type="button"
            onClick={c.remove}
            aria-label={`Bỏ lọc ${c.label}`}
            className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </Badge>
      ))}
      <Button type="button" variant="link" size="sm" className="h-8 px-2 text-xs" onClick={onClear}>
        Xoá tất cả
      </Button>
    </div>
  );
}

/**
 * SCR-09 filter bar. No "thuộc MCN" filter (BR-55).
 * Layout follows the filter bar's own width (container queries), not the viewport,
 * because the sidebar already takes part of the screen:
 *   ≥ @4xl (896px): one line — search · 4 filters · sort
 *   @xl–@4xl:      search + sort, then the 4 filters in a 4-column grid
 *   < @xl:          search, then [Bộ lọc] [Sắp xếp]; filters live in a bottom sheet
 */
export function SearchFilters({ query, onChange, onClear }: SearchFiltersProps) {
  const [text, setText] = useState(query.keyword ?? '');
  const committed = useRef(query.keyword ?? '');
  const [sheetOpen, setSheetOpen] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Follow external keyword changes (clear filters, browser back) but not our own commits.
  useEffect(() => {
    const kw = query.keyword ?? '';
    if (kw !== committed.current) {
      committed.current = kw;
      setText(kw);
    }
  }, [query.keyword]);

  useEffect(() => {
    if (text === committed.current) return;
    const id = window.setTimeout(() => {
      committed.current = text;
      onChangeRef.current({ keyword: text.trim() ? text : undefined });
    }, 300);
    return () => window.clearTimeout(id);
  }, [text]);

  const filterCount = activeFilterCount(query);
  const active = hasActiveFilters(query);
  const sort = query.sort ?? 'relevance';

  const filters = (triggerClass?: string) => (
    <>
      <FilterSelect<KolCategory>
        label="Lĩnh vực"
        allLabel="Tất cả lĩnh vực"
        value={query.category}
        options={KOL_CATEGORIES.map((c) => ({ key: c, label: c }))}
        onChange={(category) => onChange({ category })}
        className={triggerClass}
      />
      <FilterSelect<KolRegion>
        label="Khu vực"
        allLabel="Tất cả khu vực"
        value={query.region}
        options={KOL_REGIONS.map((r) => ({ key: r, label: r }))}
        onChange={(region) => onChange({ region })}
        className={triggerClass}
      />
      <FilterSelect<KolScale>
        label="Quy mô"
        allLabel="Tất cả quy mô"
        value={query.scale}
        options={KOL_SCALES.map((s) => ({ key: s.key, label: s.label }))}
        onChange={(scale) => onChange({ scale })}
        className={triggerClass}
      />
      <PlatformSelect
        value={query.platforms ?? []}
        onChange={(platforms) => onChange({ platforms })}
        className={triggerClass}
      />
    </>
  );

  const clear = () => {
    committed.current = '';
    setText('');
    onClear();
  };

  return (
    <div className="@container space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search — full width on phones, grows to fill the line from @xl */}
        <div className="relative order-1 w-full min-w-0 @xl:w-auto @xl:min-w-48 @xl:flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tìm tên, nghệ danh, KOL ID, link kênh"
            aria-label="Tìm KOL theo tên, nghệ danh, KOL ID hoặc link kênh"
            className="h-10 bg-card pl-9"
          />
        </div>

        {/* Inline filters — hidden on phones (bottom sheet instead) */}
        <div className="order-3 hidden w-full grid-cols-4 gap-2 @xl:grid @4xl:order-2 @4xl:flex @4xl:w-auto">
          {filters('@4xl:w-32')}
        </div>

        {/* Sort — separated from filters on the one-line layout */}
        <div className="order-2 hidden w-52 @xl:block @4xl:order-3 @4xl:w-44 @4xl:border-l @4xl:border-border @4xl:pl-2">
          <SortSelect value={sort} onChange={(s) => onChange({ sort: s })} />
        </div>

        {/* Phones: [Bộ lọc] [Sắp xếp] side by side */}
        <div className="order-2 flex w-full gap-2 @xl:hidden">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn('h-11 flex-1 bg-card font-normal', filterCount > 0 && triggerActive)}
              >
                <SlidersHorizontal aria-hidden />
                Bộ lọc
                {filterCount > 0 && (
                  <Badge className="ml-0.5 px-1.5" aria-label={`${filterCount} bộ lọc đang bật`}>
                    {filterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="max-h-[85dvh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            >
              <SheetHeader className="text-left">
                <SheetTitle>Bộ lọc</SheetTitle>
                <SheetDescription>Chỉ hiện KOL có kênh đã xác thực còn hiệu lực.</SheetDescription>
              </SheetHeader>
              <div className="grid gap-3">{filters('h-11')}</div>
              <SheetFooter className="flex-row gap-2">
                {active && (
                  <Button type="button" variant="outline" className="h-11 flex-1" onClick={clear}>
                    Xoá bộ lọc
                  </Button>
                )}
                <Button type="button" className="h-11 flex-1" onClick={() => setSheetOpen(false)}>
                  Xem kết quả
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <SortSelect value={sort} onChange={(s) => onChange({ sort: s })} className="h-11 flex-1" />
        </div>
      </div>

      {active && <ActiveFilterChips query={query} onChange={onChange} onClear={clear} />}
    </div>
  );
}
