import { format } from 'date-fns';
import { AlertTriangle, CheckCircle2, Circle, CircleDot, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import { buildTimeline, channelService, type KolProfile, type McnProfile, type TimelineStep } from '../../services';
import { useLiveQuery } from '../shared/useLiveQuery';

const ICON: Record<TimelineStep['state'], { icon: typeof Circle; className: string }> = {
  done: { icon: CheckCircle2, className: 'text-chart-4' },
  success: { icon: CheckCircle2, className: 'text-chart-4' },
  current: { icon: CircleDot, className: 'text-primary' },
  warning: { icon: AlertTriangle, className: 'text-chart-5' },
  error: { icon: XCircle, className: 'text-destructive' },
  todo: { icon: Circle, className: 'text-muted-foreground' },
};

/** Box 2 — "Trạng thái xét duyệt": 3-step read-only timeline, no buttons (BR-19). */
export function ReviewStatusBox({ profile }: { profile: KolProfile | McnProfile }) {
  const steps = buildTimeline(profile);
  const showFixes = profile.status === 'NEEDS_FIX' || profile.status === 'APPROVED';
  const channels = useLiveQuery(() => channelService.list(profile.accountId), [profile.accountId]);
  const fixes = showFixes ? (channels.data ?? []).filter((c) => c.status === 'NEEDS_FIX') : [];

  return (
    <Card className="gap-4 py-4 md:py-5">
      <CardHeader className="px-4 md:px-6">
        <CardTitle className="text-base">Trạng thái xét duyệt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 md:px-6">
        <ol className="relative space-y-5">
          {steps.map((s, i) => {
            const { icon: Icon, className } = ICON[s.state];
            return (
              <li key={s.key} className="relative flex gap-3">
                {i < steps.length - 1 && (
                  <span className="absolute top-6 bottom-[-1.25rem] left-[9px] w-px bg-border" aria-hidden />
                )}
                <span className="relative mt-0.5 flex size-5 shrink-0 items-center justify-center">
                  {s.state === 'current' && (
                    <span className="absolute inline-flex size-5 animate-pulse rounded-full bg-primary/20" aria-hidden />
                  )}
                  <Icon className={cn('relative size-5', className)} aria-hidden />
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className={cn('text-sm font-medium', s.state === 'todo' ? 'text-muted-foreground' : 'text-foreground')}>
                    {s.label}
                  </p>
                  {s.at !== undefined && <p className="text-xs text-muted-foreground">{format(s.at, 'dd/MM/yyyy HH:mm')}</p>}
                  {s.note && (
                    <p className={cn('text-xs', s.state === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
                      {s.key === 'result' ? `Lý do: ${s.note}` : s.note}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {fixes.length > 0 && (
          <div className="space-y-1.5 rounded-lg bg-chart-5/10 p-3">
            <p className="text-sm font-medium text-foreground">Kênh cần bổ sung</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {fixes.map((c) => (
                <li key={c.id}>
                  <span className="text-foreground">{c.handle}</span>: {c.note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
