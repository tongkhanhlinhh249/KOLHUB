import { useEffect, useId, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group';
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

interface SearchFiltersProps {
  query: KolSearchQuery;
  onChange(patch: Partial<KolSearchQuery>): void;
  onClear(): void;
}

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
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : (v as T))}>
      <SelectTrigger aria-label={label} className={className ?? 'h-10 w-full md:w-44'}>
        <SelectValue />
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

function PlatformChips({ value, onChange }: { value: Platform[]; onChange(v: Platform[]): void }) {
  const titleId = useId();
  return (
    <div role="group" aria-labelledby={titleId} className="flex flex-wrap items-center gap-2">
      <span id={titleId} className="text-xs font-medium text-muted-foreground">
        Nền tảng có dấu
      </span>
      <ToggleGroup
        type="multiple"
        variant="outline"
        value={value}
        onValueChange={(v) => onChange(v as Platform[])}
        className="flex-wrap"
      >
        {PLATFORMS.map((p) => (
          <ToggleGroupItem key={p.key} value={p.key} className="h-10 gap-1.5 px-3" aria-label={p.label}>
            <PlatformIcon platform={p.key} />
            {p.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

/** SCR-09 filter bar. No "thuộc MCN" filter (BR-55). */
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

  const filters = (inSheet: boolean) => {
    const cls = inSheet ? 'h-11 w-full' : undefined;
    return (
      <>
        <FilterSelect<KolCategory>
          label="Lĩnh vực"
          allLabel="Tất cả lĩnh vực"
          value={query.category}
          options={KOL_CATEGORIES.map((c) => ({ key: c, label: c }))}
          onChange={(category) => onChange({ category })}
          className={cls}
        />
        <FilterSelect<KolRegion>
          label="Khu vực"
          allLabel="Tất cả khu vực"
          value={query.region}
          options={KOL_REGIONS.map((r) => ({ key: r, label: r }))}
          onChange={(region) => onChange({ region })}
          className={cls}
        />
        <FilterSelect<KolScale>
          label="Quy mô"
          allLabel="Tất cả quy mô"
          value={query.scale}
          options={KOL_SCALES.map((s) => ({ key: s.key, label: s.label }))}
          onChange={(scale) => onChange({ scale })}
          className={cls}
        />
        <PlatformChips value={query.platforms ?? []} onChange={(platforms) => onChange({ platforms })} />
      </>
    );
  };

  const clear = () => {
    committed.current = '';
    setText('');
    onClear();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tìm theo tên, nghệ danh, KOL ID hoặc link kênh"
            aria-label="Tìm KOL"
            className="h-10 pl-9"
          />
        </div>
        <Select value={query.sort ?? 'relevance'} onValueChange={(v) => onChange({ sort: v as SearchSort })}>
          <SelectTrigger aria-label="Sắp xếp" className="h-10 min-w-0 flex-1 sm:w-56 sm:flex-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.key} value={o.key}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" className="h-10 md:hidden">
              <SlidersHorizontal aria-hidden />
              Bộ lọc
              {filterCount > 0 && (
                <Badge className="ml-0.5 px-1.5" aria-label={`${filterCount} bộ lọc đang bật`}>
                  {filterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <SheetHeader className="text-left">
              <SheetTitle>Bộ lọc</SheetTitle>
              <SheetDescription>Chỉ hiện KOL có kênh đã xác thực còn hiệu lực.</SheetDescription>
            </SheetHeader>
            <div className="space-y-3">{filters(true)}</div>
            <SheetFooter className="gap-2">
              {active && (
                <Button type="button" variant="ghost" className="h-11" onClick={clear}>
                  Xoá bộ lọc
                </Button>
              )}
              <Button type="button" className="h-11" onClick={() => setSheetOpen(false)}>
                Xem kết quả
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden flex-wrap items-center gap-2 md:flex">
        {filters(false)}
        {active && (
          <Button type="button" variant="ghost" className="h-10" onClick={clear}>
            <X aria-hidden />
            Xoá bộ lọc
          </Button>
        )}
      </div>
      {active && (
        <div className="md:hidden">
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            <X aria-hidden />
            Xoá bộ lọc
          </Button>
        </div>
      )}
    </div>
  );
}
