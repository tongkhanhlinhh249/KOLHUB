import { format } from 'date-fns';
import { Link } from 'react-router';
import { AlertTriangle, CheckCircle2, ChevronRight, Circle, CircleDot, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import { buildTimeline, type Channel, type KolProfile, type McnProfile, type ProfileStatus, type TimelineStep } from '../../services';
import { CHANNEL_PARAM } from '../channels/ChannelDetailSheet';
import { infoPath, profilePath } from '../profile/primaryAction';
import { ProfileStatusBadge } from '../shared/StatusBadges';

const ICON: Record<TimelineStep['state'], { icon: typeof Circle; className: string }> = {
  done: { icon: CheckCircle2, className: 'text-chart-4' },
  success: { icon: CheckCircle2, className: 'text-chart-4' },
  current: { icon: CircleDot, className: 'text-primary' },
  warning: { icon: AlertTriangle, className: 'text-chart-5' },
  error: { icon: XCircle, className: 'text-destructive' },
  todo: { icon: Circle, className: 'text-muted-foreground' },
};

const SUMMARY: Record<ProfileStatus, string> = {
  DRAFT: 'Hồ sơ chưa được gửi. Hoàn thiện các điều kiện rồi gửi xét duyệt để được xác thực.',
  SUBMITTED: 'Hồ sơ đã được gửi và đang chờ xét duyệt.',
  NEEDS_FIX: 'Hồ sơ cần bổ sung. Cập nhật theo yêu cầu bên dưới rồi gửi lại hồ sơ.',
  APPROVED: 'Hồ sơ đã được duyệt.',
  REJECTED: 'Hồ sơ không được duyệt.',
};

const linkClass = 'inline-flex items-center gap-0.5 font-medium text-primary underline-offset-4 hover:underline';

/** "Trạng thái xét duyệt": current status, 3-step read-only timeline (BR-19) and what needs fixing. */
export function ReviewStatusBox({ profile, channels }: { profile: KolProfile | McnProfile; channels: Channel[] }) {
  const steps = buildTimeline(profile);
  const needsFix = profile.status === 'NEEDS_FIX';
  const showFixes = needsFix || profile.status === 'APPROVED';
  const fixes = showFixes ? channels.filter((c) => c.status === 'NEEDS_FIX') : [];
  const channelsPath = profilePath(profile.ownerType, 'kenh');

  return (
    <Card className="gap-4 py-4 md:py-5">
      <CardHeader className="px-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Trạng thái xét duyệt</CardTitle>
          <ProfileStatusBadge status={profile.status} />
        </div>
        <p className="text-sm text-muted-foreground">{SUMMARY[profile.status]}</p>
      </CardHeader>
      <CardContent className="space-y-4 px-4 md:px-6">
        <ol className="relative space-y-5" aria-label="Tiến trình xét duyệt">
          {steps.map((s, i) => {
            const { icon: Icon, className } = ICON[s.state];
            // The NEEDS_FIX reason is shown in the "Cần bổ sung" box below instead.
            const note = s.key === 'result' && s.state === 'warning' ? undefined : s.note;
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
                  {note && (
                    <p className={cn('text-xs break-words', s.state === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
                      {s.key === 'result' ? `Lý do: ${note}` : note}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {needsFix && (
          <div className="space-y-2 rounded-lg bg-chart-5/10 p-3">
            <p className="text-sm font-medium text-foreground">Yêu cầu bổ sung</p>
            {profile.decisionReason && <p className="text-sm break-words text-foreground">{profile.decisionReason}</p>}
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link to={infoPath(profile.ownerType, 'dinh-danh')} className={linkClass}>
                Thông tin định danh
                <ChevronRight className="size-4" aria-hidden />
              </Link>
              <Link to={infoPath(profile.ownerType, 'lien-he')} className={linkClass}>
                Thông tin liên hệ
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </p>
          </div>
        )}

        {fixes.length > 0 && (
          <div className="space-y-1.5 rounded-lg bg-chart-5/10 p-3">
            <p className="text-sm font-medium text-foreground">Kênh cần bổ sung</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {fixes.map((c) => (
                <li key={c.id} className="break-words">
                  <Link to={`${channelsPath}?${CHANNEL_PARAM}=${encodeURIComponent(c.id)}`} className={linkClass}>
                    {c.handle}
                  </Link>
                  {c.note && <>: {c.note}</>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
