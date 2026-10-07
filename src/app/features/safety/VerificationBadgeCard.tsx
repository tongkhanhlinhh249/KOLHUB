import { Link } from 'react-router';
import { BadgeCheck, Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '../../components/ui/utils';
import { APPS_PATH, KOL_SAFETY_PATH } from '../../auth/roles';
import { kolSafetyReportService, type ChannelShieldRow } from '../../services';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ShieldStatusBadge } from './ShieldParts';

/** Badge Xác thực Kol.gov.vn: approved profile + every verified channel holding an ACTIVE "Khiên An toàn". */
export function verificationBadge(approved: boolean, rows: ChannelShieldRow[]) {
  const verified = rows.filter((r) => r.verified);
  const shielded = verified.filter((r) => r.status === 'ACTIVE');
  return { verified: verified.length, shielded: shielded.length, granted: approved && verified.length > 0 && shielded.length === verified.length };
}

function Criterion({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {done ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />}
      <span className={done ? 'text-foreground' : 'text-foreground/90'}>
        {children}
        <span className="sr-only">{done ? ' (đã đạt)' : ' (chưa đạt)'}</span>
      </span>
    </li>
  );
}

/** Tổng quan hồ sơ (KOL/MCN): the two criteria of the Kol.gov.vn verification badge, channel by channel. */
export function VerificationBadgeCard({ accountId, approved }: { accountId: string; approved: boolean }) {
  const q = useLiveQuery(() => Promise.all([kolSafetyReportService.listShields(accountId), kolSafetyReportService.getSettings(accountId)]), [accountId]);
  if (!q.data) return null;
  const [rows, settings] = q.data;
  const b = verificationBadge(approved, rows);
  return (
    <section aria-labelledby="gov-badge" className="space-y-3 rounded-[8px] border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <BadgeCheck className={cn('size-5 shrink-0', b.granted ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
        <h2 id="gov-badge" className="text-sm font-semibold text-foreground">
          Badge Xác thực Kol.gov.vn
        </h2>
        <span className={cn('ml-auto text-xs font-medium', b.granted ? 'text-primary' : 'text-muted-foreground')}>{b.granted ? 'Đã đạt' : 'Chưa đạt'}</span>
      </div>
      <ul className="space-y-1.5">
        <Criterion done={approved}>Hồ sơ đã khai báo đủ và được duyệt</Criterion>
        <Criterion done={b.verified > 0 && b.shielded === b.verified}>
          Mọi kênh đã xác thực có Khiên An toàn ({b.shielded}/{b.verified} kênh) — quét 10 nội dung mỗi kênh qua KOL Safety
        </Criterion>
      </ul>
      {!settings.enabled ? (
        <p className="text-xs text-muted-foreground">
          KOL Safety đang tắt.{' '}
          <Link to={APPS_PATH} className="font-medium text-primary hover:underline">
            Bật trong Ứng dụng
          </Link>{' '}
          để quét và xin khiên.
        </p>
      ) : (
        rows.length > 0 && (
          <ul className="divide-y divide-border rounded-[6px] border border-border">
            {rows.map((r) => (
              <li key={r.channelId}>
                <Link
                  to={`${KOL_SAFETY_PATH}?kenh=${encodeURIComponent(r.channelId)}`}
                  className="flex min-h-11 items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <PlatformIcon platform={r.platform} className="size-5 shrink-0 rounded" />
                  <span className="min-w-0 flex-1 truncate text-foreground">@{r.handle}</span>
                  {r.verified ? <ShieldStatusBadge status={r.status} /> : <span className="text-xs text-muted-foreground">Chưa có dấu xác thực</span>}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  );
}
