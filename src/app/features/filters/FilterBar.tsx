import { useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
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
import { ActiveFilterChips, type FilterChip } from './ActiveFilterChips';
import { triggerActive } from './FilterSelect';
import { KeywordSearch } from './KeywordSearch';

interface FilterBarProps {
  /** Committed keyword (from the URL). */
  keyword: string | undefined;
  /** Called 300 ms after typing stops; empty text → undefined. */
  onKeywordChange(keyword: string | undefined): void;
  searchPlaceholder: string;
  searchLabel: string;
  /** Filter controls; `triggerClass` sizes them for the current layout. */
  renderFilters(triggerClass?: string): ReactNode;
  /** Column count of the @xl–@4xl filter grid, e.g. "grid-cols-4". */
  filterGridClass: string;
  /** Width of each filter on the one-line layout, e.g. "@4xl:w-32". */
  inlineFilterClass: string;
  renderSort(className?: string): ReactNode;
  /** Extra classes for the sort box on wide layouts, e.g. "@4xl:w-56" for long sort labels. */
  sortClass?: string;
  /** Filters set (keyword and sort excluded) — badge on the mobile "Bộ lọc" button. */
  filterCount: number;
  /** Keyword or any filter set — shows the chips row and "Xoá bộ lọc". */
  active: boolean;
  chips: FilterChip[];
  onClear(): void;
  sheetDescription?: string;
  /** The keyword box lives elsewhere (e.g. the Sàn header); the bar only shows filters + sort. */
  hideSearch?: boolean;
}

/**
 * One-line filter bar. Layout follows the bar's own width (container queries), not the viewport,
 * because the sidebar already takes part of the screen:
 *   ≥ @4xl (896px): one line — search · filters · sort
 *   @xl–@4xl:      search + sort, then the filters in a grid
 *   < @xl:          search, then [Bộ lọc] [Sắp xếp]; filters live in a bottom sheet
 */
export function FilterBar({
  keyword,
  onKeywordChange,
  searchPlaceholder,
  searchLabel,
  renderFilters,
  filterGridClass,
  inlineFilterClass,
  renderSort,
  sortClass,
  filterCount,
  active,
  chips,
  onClear,
  sheetDescription,
  hideSearch = false,
}: FilterBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  // External keyword changes (incl. this clear) flow back into the search box through `keyword`.
  const clear = () => onClear();

  return (
    <div className="@container space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search — full width on phones, grows to fill the line from @xl (hidden when the page has its own search) */}
        {!hideSearch && (
          <KeywordSearch
            keyword={keyword}
            onKeywordChange={onKeywordChange}
            placeholder={searchPlaceholder}
            label={searchLabel}
            className="order-1 w-full @xl:w-auto @xl:min-w-48 @xl:flex-1"
          />
        )}

        {/* Inline filters — hidden on phones (bottom sheet instead) */}
        <div className={cn('order-3 hidden w-full gap-2 @xl:grid @4xl:order-2 @4xl:flex @4xl:w-auto', filterGridClass)}>
          {renderFilters(inlineFilterClass)}
        </div>

        {/* Sort — separated from filters on the one-line layout */}
        <div
          className={cn(
            'order-2 hidden w-52 @xl:block @4xl:order-3 @4xl:w-44 @4xl:border-l @4xl:border-border @4xl:pl-2',
            hideSearch && '@xl:ml-auto',
            sortClass,
          )}
        >
          {renderSort()}
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
                <SheetDescription className={sheetDescription ? undefined : 'sr-only'}>
                  {sheetDescription ?? 'Chọn bộ lọc rồi bấm Xem kết quả.'}
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-3">{renderFilters('h-11')}</div>
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
          {renderSort('h-11 flex-1')}
        </div>
      </div>

      {active && <ActiveFilterChips chips={chips} onClear={clear} />}
    </div>
  );
}
