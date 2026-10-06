import { useEffect, useState } from 'react';
import { Building2, ExternalLink } from 'lucide-react';
import { Skeleton } from '../../components/ui/skeleton';
import { portfolioService, type PublicPost } from '../../services';
import { PlatformIcon, platformLabel } from '../biz-search/PlatformIcon';
import { formatDateTime } from '../supplier-booking/supplierBooking';
import { compactNumber, portfolioTotals } from './portfolioView';

const MAX = 6;

/**
 * "Bài đã đăng" on the brand-facing KOL profile: verified campaign posts the KOL (or its MCN) keeps shown on the
 * profile. Public data only: platform, link, brand, date and metrics (no price, campaign name or ratings).
 */
export function PublicPosts({ kolId }: { kolId: string }) {
  const [posts, setPosts] = useState<PublicPost[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [all, setAll] = useState(false);

  useEffect(() => {
    let alive = true;
    setPosts(null);
    setFailed(false);
    setAll(false);
    portfolioService
      .listPublic(kolId)
      .then((p) => alive && setPosts(p))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [kolId]);

  if (failed) return <p className="text-sm text-muted-foreground">Không tải được bài đã đăng.</p>;
  if (!posts) return <Skeleton className="h-24 w-full rounded-xl" aria-label="Đang tải bài đã đăng" />;
  if (posts.length === 0) return <p className="text-sm text-muted-foreground">KOL chưa có bài đăng chiến dịch nào được hiển thị.</p>;

  const t = portfolioTotals(posts);
  const shown = all ? posts : posts.slice(0, MAX);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t.posts} bài đã xác minh · {compactNumber(t.views)} lượt xem · tỉ lệ tương tác {t.engagementRate.toLocaleString('vi-VN')}%
      </p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {shown.map((p) => (
          <li key={p.id}>
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col gap-2 rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="flex items-start gap-2">
                <PlatformIcon platform={p.platform} className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 flex-1 text-sm leading-snug font-medium text-foreground">{p.title}</span>
                <ExternalLink className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden />
                <span className="sr-only">(mở tab mới)</span>
              </span>
              <span className="flex min-w-0 flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
                <Building2 className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{p.brandCompany}</span>
                <span>· {platformLabel(p.platform)}</span>
                <span>· {formatDateTime(p.verifiedAt).slice(0, 10)}</span>
              </span>
              <span className="mt-auto flex gap-3 text-xs text-foreground tabular-nums">
                <span>{compactNumber(p.metrics.views)} xem</span>
                <span>{compactNumber(p.metrics.likes)} thích</span>
                <span>{p.metrics.engagementRate.toLocaleString('vi-VN')}% tương tác</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      {posts.length > MAX && !all && (
        <button type="button" className="min-h-11 text-sm font-medium text-primary underline-offset-4 hover:underline" onClick={() => setAll(true)}>
          Xem thêm {posts.length - MAX} bài
        </button>
      )}
    </div>
  );
}
