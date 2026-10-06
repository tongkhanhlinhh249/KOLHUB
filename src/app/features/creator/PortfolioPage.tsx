import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AlertCircle, Building2, ExternalLink, Eye, EyeOff, Images, RotateCcw, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { Switch } from '../../components/ui/switch';
import { cn } from '../../components/ui/utils';
import { portfolioService, type PortfolioPost } from '../../services';
import { MARKETPLACE_PATH } from '../../auth/roles';
import { PlatformIcon, platformLabel } from '../biz-search/PlatformIcon';
import { useLiveQuery } from '../shared/useLiveQuery';
import { SupplierGate, useSupplierAccess } from '../supplier-booking/useSupplierAccess';
import { bookingDetailPath, formatDateTime, withParam } from '../supplier-booking/supplierBooking';
import { errText } from '../supplier-booking/parts';
import { compactNumber, filterPosts, parsePortfolioParams, PERIODS, platformsOf, portfolioTotals } from './portfolioView';

const chip = (active: boolean) =>
  cn(
    'inline-flex h-11 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors md:h-8',
    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-muted',
  );

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-[8px] border border-border bg-card p-3 md:p-4">
      <dt className="truncate text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 min-w-0">
        <span className="block truncate text-lg font-bold text-foreground tabular-nums md:text-xl">{value}</span>
        {hint && <span className="block truncate text-xs text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}

function Stars({ stars }: { stars: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${stars}/5 sao`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn('size-3.5', i <= stars ? 'fill-chart-5 text-chart-5' : 'text-muted-foreground/40')} aria-hidden />
      ))}
    </span>
  );
}

function PostRow({ post: p, showKol, onToggle, busy }: { post: PortfolioPost; showKol: boolean; onToggle(v: boolean): void; busy: boolean }) {
  const m = p.metrics;
  const switchId = `hien-${p.contentId}`;
  return (
    <Card className={cn('gap-3 p-4 md:p-5', !p.visible && 'bg-muted/30')}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-muted">
          <PlatformIcon platform={p.platform} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm leading-snug font-semibold break-words text-foreground md:text-base">{p.title}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span>{platformLabel(p.platform)}</span>
            {p.channelHandle && <span>· {p.channelHandle}</span>}
            {showKol && <span>· KOL {p.kolName}</span>}
            <span>· Xác minh {formatDateTime(p.verifiedAt).slice(0, 10)}</span>
          </p>
        </div>
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'size-11 shrink-0 md:size-9' })}
          aria-label={`Mở bài đăng "${p.title}" (tab mới)`}
        >
          <ExternalLink className="size-4" aria-hidden />
        </a>
      </div>

      <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <Building2 className="size-3.5 shrink-0" aria-hidden />
        <span className="font-medium text-foreground">{p.brandCompany}</span>
        <span>·</span>
        <Link to={bookingDetailPath(p.bookingId)} className="min-w-0 truncate text-primary underline-offset-4 hover:underline">
          {p.campaignName}
        </Link>
      </p>

      <dl className="grid grid-cols-2 gap-2 rounded-[8px] bg-muted/40 p-2.5 text-center sm:grid-cols-4">
        {[
          ['Lượt xem', compactNumber(m.views)],
          ['Thích', compactNumber(m.likes)],
          ['Bình luận · Chia sẻ', `${compactNumber(m.comments)} · ${compactNumber(m.shares)}`],
          ['Tỉ lệ tương tác', `${m.engagementRate.toLocaleString('vi-VN')}%`],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="truncate text-[11px] text-muted-foreground">{k}</dt>
            <dd className="text-sm font-semibold text-foreground tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="min-w-0 text-xs text-muted-foreground">
          {p.brandRating ? (
            <span className="flex flex-wrap items-center gap-1.5">
              Nhãn hàng đánh giá <Stars stars={p.brandRating.stars} />
              {p.brandRating.comment && <span className="italic">“{p.brandRating.comment}”</span>}
            </span>
          ) : (
            'Chưa có đánh giá từ Nhãn hàng'
          )}
        </div>
        <label htmlFor={switchId} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-foreground md:min-h-0">
          {p.visible ? <Eye className="size-4 text-primary" aria-hidden /> : <EyeOff className="size-4 text-muted-foreground" aria-hidden />}
          Hiện trên hồ sơ
          <Switch id={switchId} checked={p.visible} disabled={busy} onCheckedChange={onToggle} />
        </label>
      </div>
    </Card>
  );
}

/**
 * /bai-da-dang — "Bài đã đăng" of the signed-in KOL / MCN: every verified post from its bookings with metrics and the
 * brand's rating; filters (?nen-tang=, ?thoi-gian=), totals, and "Hiện trên hồ sơ" per post (hidden posts are not
 * shown to brands on the KOL profile).
 */
export function PortfolioPage() {
  const access = useSupplierAccess();
  const [params, setParams] = useSearchParams();
  const q = useLiveQuery(() => (access.approved ? portfolioService.listMine() : Promise.resolve(null)), [access.approved, access.accountId]);
  const [busy, setBusy] = useState<string | null>(null);
  const query = parsePortfolioParams(params);
  const now = Date.now();
  const all = q.data ?? undefined;
  const rows = useMemo(() => filterPosts(all ?? [], query, now), [all, query.platform, query.period]); // eslint-disable-line react-hooks/exhaustive-deps
  const totals = portfolioTotals(rows);
  const platforms = platformsOf(all ?? []);
  const isMcn = access.ownerType === 'MCN';

  const set = (k: string, v: string | null) => setParams((prev) => withParam(prev, k, v), { replace: true });
  const toggle = async (p: PortfolioPost, visible: boolean) => {
    setBusy(p.contentId);
    try {
      await portfolioService.setVisible(p.bookingId, p.contentId, visible);
      toast.success(visible ? 'Bài đăng đã hiện trên hồ sơ' : 'Đã ẩn bài đăng khỏi hồ sơ');
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(null);
    }
  };

  if (access.loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-3 p-4 md:p-6" aria-busy="true">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const empty = (title: string, text: string) => (
    <div className="flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-border px-4 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Images className="size-6" aria-hidden />
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{text}</p>
      <Link to={MARKETPLACE_PATH} className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}>
        Xem Sàn chiến dịch
      </Link>
    </div>
  );

  if (!access.approved) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
        <SupplierGate ownerType={access.ownerType} status={access.status} />
        {empty('Bài đã đăng sẽ xuất hiện ở đây', 'Sau khi hồ sơ được duyệt và bạn hoàn thành chiến dịch, các bài đăng đã xác minh được tập hợp tại trang này.')}
      </div>
    );
  }

  let body: ReactNode;
  if (q.loading && !all) {
    body = (
      <div className="space-y-3" aria-busy="true" aria-label="Đang tải bài đã đăng">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  } else if (q.error && !all) {
    body = (
      <Alert variant="destructive">
        <AlertCircle className="size-4" aria-hidden />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>Không tải được bài đã đăng.</span>
          <Button type="button" variant="outline" size="sm" className="h-11 md:h-8" onClick={q.reload}>
            <RotateCcw aria-hidden />
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else if (all && all.length === 0) {
    body = empty('Chưa có bài đăng nào được xác minh', 'Khi bạn gửi link bài đăng trong một chiến dịch và hệ thống xác minh xong, bài sẽ xuất hiện ở đây cùng số liệu.');
  } else if (rows.length === 0) {
    body = <p className="rounded-[8px] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">Không có bài đăng nào khớp bộ lọc.</p>;
  } else {
    body = (
      <ul className="flex flex-col gap-3" aria-label="Bài đã đăng">
        {rows.map((p) => (
          <li key={p.contentId}>
            <PostRow post={p} showKol={isMcn} busy={busy === p.contentId} onToggle={(v) => void toggle(p, v)} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="@container mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      {all && all.length > 0 && (
        <>
          <dl className="grid grid-cols-2 gap-2 @2xl:grid-cols-4 md:gap-3">
            <StatTile label="Bài đã đăng" value={totals.posts} hint={`${totals.visible} bài hiện trên hồ sơ`} />
            <StatTile label="Lượt xem" value={compactNumber(totals.views)} />
            <StatTile label="Lượt tương tác" value={compactNumber(totals.engagements)} hint="Thích, bình luận, chia sẻ" />
            <StatTile label="Tỉ lệ tương tác" value={`${totals.engagementRate.toLocaleString('vi-VN')}%`} />
          </dl>
          <div className="space-y-2">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Lọc theo nền tảng">
              <button type="button" className={chip(!query.platform)} aria-pressed={!query.platform} onClick={() => set('nen-tang', null)}>
                Tất cả nền tảng
              </button>
              {platforms.map((pf) => (
                <button key={pf} type="button" className={chip(query.platform === pf)} aria-pressed={query.platform === pf} onClick={() => set('nen-tang', pf)}>
                  <PlatformIcon platform={pf} className="size-4" />
                  {platformLabel(pf)}
                </button>
              ))}
            </div>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Lọc theo thời gian">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={chip(query.period === p.key)}
                  aria-pressed={query.period === p.key}
                  onClick={() => set('thoi-gian', p.key === 'tat-ca' ? null : p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Nhãn hàng chỉ thấy các bài đang bật "Hiện trên hồ sơ" (không kèm giá, tên chiến dịch hay đánh giá).</p>
        </>
      )}
      {body}
    </div>
  );
}
