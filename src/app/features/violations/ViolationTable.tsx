import type { ReactNode } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { ContentCell, formatDay, SeverityBadge, SourceLabel, ViolationStatusBadge } from './ViolationParts';
import type { ViolationRowBase } from './violationQuery';

interface ViolationTableProps<T extends ViolationRowBase> {
  rows: T[];
  onView(v: T): void;
  /** Brand: KOL column; clicking the name opens the KOL detail sheet. */
  onKol?(v: T): void;
  /** Row actions (owner). Without it the column shows a "Xem chi tiết" button. */
  renderActions?(v: T): ReactNode;
  label: string;
}

function KolName<T extends ViolationRowBase>({ v, onKol }: { v: T; onKol(v: T): void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onKol(v);
      }}
      className="max-w-full truncate rounded-sm text-left text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {v.kolName}
    </button>
  );
}

function ViewButton({ onClick, label }: { onClick(): void; label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-11 md:h-9"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Eye aria-hidden />
      Xem chi tiết
    </Button>
  );
}

/**
 * Violations as a table on wide containers (≥ @4xl) and as stacked cards below, so there is
 * no horizontal scrolling on phones. Same component for owner (with actions) and Brand (read-only).
 */
export function ViolationTable<T extends ViolationRowBase>({ rows, onView, onKol, renderActions, label }: ViolationTableProps<T>) {
  const actions = (v: T) => renderActions?.(v) ?? <ViewButton onClick={() => onView(v)} label={`Xem chi tiết: ${v.contentTitle}`} />;
  return (
    <div className="@container">
      {/* Wide: table */}
      <Card className="hidden gap-0 overflow-hidden p-0 @4xl:block">
        <Table aria-label={label}>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[32%]">Nội dung</TableHead>
              {onKol && <TableHead>KOL</TableHead>}
              <TableHead>Loại vi phạm</TableHead>
              <TableHead>Mức độ</TableHead>
              <TableHead>Nguồn</TableHead>
              <TableHead>Ngày phát hiện</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((v) => (
              <TableRow key={v.id} className="cursor-pointer" onClick={() => onView(v)}>
                <TableCell className="max-w-0 py-3">
                  <ContentCell v={v} onTitle={() => onView(v)} />
                </TableCell>
                {onKol && (
                  <TableCell className="max-w-40">
                    <KolName v={v} onKol={onKol} />
                    <p className="truncate text-xs text-muted-foreground">{v.kolId}</p>
                  </TableCell>
                )}
                <TableCell className="text-sm text-foreground">{v.category}</TableCell>
                <TableCell>
                  <SeverityBadge severity={v.severity} />
                </TableCell>
                <TableCell>
                  <SourceLabel source={v.source} />
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap text-foreground tabular-nums">{formatDay(v.detectedAt)}</TableCell>
                <TableCell>
                  <ViolationStatusBadge status={v.status} />
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end">{actions(v)}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Narrow: stacked cards */}
      <ul className="flex flex-col gap-3 @4xl:hidden" aria-label={label}>
        {rows.map((v) => (
          <li key={v.id}>
            <Card className="gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <ContentCell v={v} onTitle={() => onView(v)} />
                <ViolationStatusBadge status={v.status} className="shrink-0" />
              </div>
              {onKol && (
                <p className="flex min-w-0 items-center gap-1.5 text-sm">
                  <span className="shrink-0 text-muted-foreground">KOL:</span>
                  <KolName v={v} onKol={onKol} />
                </p>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Loại vi phạm</dt>
                  <dd className="text-foreground">{v.category}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Mức độ</dt>
                  <dd className="mt-0.5">
                    <SeverityBadge severity={v.severity} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Nguồn</dt>
                  <dd className="mt-0.5">
                    <SourceLabel source={v.source} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Ngày phát hiện</dt>
                  <dd className="text-foreground tabular-nums">{formatDay(v.detectedAt)}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">{actions(v)}</div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
