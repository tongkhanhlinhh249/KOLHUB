import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { FileWarning, Radar } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import {
  VIOLATION_SEVERITIES,
  VIOLATION_SOURCE_LABEL,
  VIOLATION_STATUS_LABEL,
  type ViolationAction,
  type ViolationSeverity,
  type ViolationSource,
  type ViolationStatus,
} from '../../services';
import { PlatformIcon, platformLabel } from '../biz-search/PlatformIcon';
import type { ViolationRowBase } from './violationQuery';

// The kit has no success/warning tokens: chart-4 (green) and chart-5 (amber) stand in for them.
const STATUS_CLASS: Record<ViolationStatus, { chip: string; dot: string }> = {
  PENDING_REVIEW: { chip: 'bg-chart-5/15 text-foreground', dot: 'bg-chart-5' },
  CONFIRMED: { chip: 'bg-destructive/10 text-destructive', dot: 'bg-destructive' },
  APPEALED: { chip: 'bg-primary/10 text-primary', dot: 'bg-primary' },
  RESOLVED: { chip: 'bg-chart-4/15 text-foreground', dot: 'bg-chart-4' },
  DISMISSED: { chip: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
};

const SEVERITY_CLASS: Record<ViolationSeverity, string> = {
  high: 'bg-destructive text-white',
  medium: 'bg-chart-5 text-foreground',
  low: 'bg-secondary text-secondary-foreground',
};

export function severityLabel(s: ViolationSeverity): string {
  return VIOLATION_SEVERITIES.find((x) => x.key === s)?.label ?? s;
}

export function ViolationStatusBadge({ status, className }: { status: ViolationStatus; className?: string }) {
  const c = STATUS_CLASS[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', c.chip, className)}>
      <span className={cn('size-1.5 shrink-0 rounded-full', c.dot)} aria-hidden />
      {VIOLATION_STATUS_LABEL[status]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: ViolationSeverity }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', SEVERITY_CLASS[severity])}>
      {severityLabel(severity)}
    </span>
  );
}

export function SourceLabel({ source }: { source: ViolationSource }) {
  const Icon = source === 'KOL_SAFETY' ? Radar : FileWarning;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap text-foreground">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      {VIOLATION_SOURCE_LABEL[source]}
    </span>
  );
}

export const formatDay = (ms: number) => format(ms, 'dd/MM/yyyy');
export const formatDayTime = (ms: number) => format(ms, 'HH:mm dd/MM/yyyy');

/** Thumbnail + title + platform/@handle. */
export function ContentCell({ v, onTitle }: { v: ViolationRowBase; onTitle?: () => void }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {v.thumbnail && <img src={v.thumbnail} alt="" loading="lazy" className="size-full object-cover" />}
        <PlatformIcon platform={v.platform} className="absolute right-0.5 bottom-0.5 size-4 ring-1 ring-card" />
      </div>
      <div className="min-w-0">
        {onTitle ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTitle();
            }}
            className="line-clamp-2 rounded-sm text-left text-sm font-medium text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {v.contentTitle}
          </button>
        ) : (
          <p className="line-clamp-2 text-sm font-medium text-foreground">{v.contentTitle}</p>
        )}
        <p className="truncate text-xs text-muted-foreground">
          {platformLabel(v.platform)} · @{v.channelHandle}
        </p>
      </div>
    </div>
  );
}

export const ACTION_LABEL: Record<ViolationAction, string> = {
  DETECTED: 'KOL Safety phát hiện khi quét kênh',
  REPORTED: 'Nhận báo cáo vi phạm',
  CONFIRMED: 'Admin xác nhận vi phạm',
  DISMISSED: 'Admin bác bỏ báo cáo',
  APPEALED: 'Chủ kênh gửi khiếu nại',
  APPEAL_ACCEPTED: 'Admin chấp nhận khiếu nại',
  APPEAL_REJECTED: 'Admin từ chối khiếu nại',
  RESOLVED: 'Chủ kênh đã khắc phục',
};

export function SummaryCard({
  label,
  value,
  hint,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone: 'amber' | 'red' | 'primary' | 'green' | 'muted';
  active?: boolean;
  onClick?: () => void;
}) {
  const bar = { amber: 'bg-chart-5', red: 'bg-destructive', primary: 'bg-primary', green: 'bg-chart-4', muted: 'bg-muted-foreground' }[tone];
  const body = (
    <>
      <span className={cn('absolute inset-y-3 left-0 w-1 rounded-r-full', bar)} aria-hidden />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold text-foreground tabular-nums">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </>
  );
  const cls = cn(
    'relative flex min-h-11 flex-col gap-0.5 overflow-hidden rounded-xl border bg-card p-4 pl-5 text-left',
    active ? 'border-primary ring-1 ring-primary' : 'border-border',
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(cls, 'transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none')}
    >
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function ViolationTableSkeleton() {
  return (
    <Card className="gap-0 p-0" aria-busy="true" aria-label="Đang tải">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border p-4 last:border-0">
          <Skeleton className="size-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="hidden h-6 w-24 rounded-full sm:block" />
        </div>
      ))}
    </Card>
  );
}
