import { useState, type ReactNode } from 'react';
import { AlertTriangle, Check, ExternalLink, FileVideo, Info, Link2, Loader2, PencilLine } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import { CONTENT_STATUS_LABEL, issueSummary, type BookingItemView, type BookingView, type ContentSubmission, type ScanResult } from '../../services';
import { formatCompactVi } from '../biz-search/format';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { IssuesSheet, ScoreChip, VerdictPill } from '../safety/SafetyParts';
import { formatFileSize } from '../shared/files';
import { ToneBadge, type Tone } from '../shared/StatusBadges';
import type { BookingActionsApi } from './BookingActions';
import { deliverableTypeLabel } from './CampaignParts';
import { formatDayTime, formatPercent } from './campaignView';

const CONTENT_TONE: Record<ContentSubmission['status'], Tone> = { PENDING: 'warning', CHANGES_REQUESTED: 'error', APPROVED: 'success' };

export const href = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

/** KOL Safety verdict + score + "n vấn đề" (opens the issue sheet). */
export function SafetySummary({ name, result }: { name: string; result: ScanResult }) {
  const [open, setOpen] = useState(false);
  const summary = issueSummary(result.issues);
  const serious = result.issues.some((i) => i.severity !== 'note');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">KOL Safety:</span>
      <VerdictPill verdict={result.verdict} />
      <ScoreChip result={result} />
      {summary ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className={cn(
            'inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-7',
            serious ? 'bg-destructive/10 text-foreground hover:bg-destructive/15' : 'bg-muted text-foreground hover:bg-muted/70',
          )}
        >
          {serious ? <AlertTriangle className="size-3.5 text-destructive" aria-hidden /> : <Info className="size-3.5 text-muted-foreground" aria-hidden />}
          {summary}
          <span className="sr-only">— xem chi tiết</span>
        </button>
      ) : (
        <span className="text-xs text-muted-foreground">Không có vấn đề</span>
      )}
      <IssuesSheet open={open} onOpenChange={setOpen} name={name} result={result} />
    </div>
  );
}

function itemLine(item?: BookingItemView): ReactNode {
  if (!item) return 'Cả booking';
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <PlatformIcon platform={item.platform} className="size-3.5" />
      <span className="truncate">
        {item.displayName} · {item.quantity} {deliverableTypeLabel(item.deliverableType)}
      </span>
    </span>
  );
}

/**
 * One draft: title, file / preview link, KOL Safety result, supplier note, brand feedback and — while it
 * is pending and the booking allows REVIEW_CONTENT — "Duyệt" / "Yêu cầu sửa".
 */
export function DraftCard({
  booking,
  draft,
  item,
  actions,
  header,
}: {
  booking: BookingView;
  draft: ContentSubmission;
  item?: BookingItemView;
  actions: BookingActionsApi;
  /** Extra line on top (e.g. supplier name in the Nội dung tab). */
  header?: ReactNode;
}) {
  const canReview = draft.status === 'PENDING' && booking.allowedActions.includes('REVIEW_CONTENT');
  const approving = actions.approving === draft.id;
  return (
    <article className="space-y-3 rounded-[8px] border border-border bg-card p-3">
      {header}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h4 className="break-words text-sm font-semibold text-foreground">{draft.title}</h4>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {itemLine(item)}
            <span aria-hidden>·</span>
            <span className="tabular-nums">Gửi {formatDayTime(draft.submittedAt)}</span>
          </p>
        </div>
        <ToneBadge tone={CONTENT_TONE[draft.status]}>{CONTENT_STATUS_LABEL[draft.status]}</ToneBadge>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        {draft.file && (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-foreground">
            <FileVideo className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{draft.file.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">({formatFileSize(draft.file.size)})</span>
          </span>
        )}
        {draft.url && (
          <a
            href={href(draft.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 min-w-0 items-center gap-1.5 text-primary hover:underline md:min-h-0"
          >
            <Link2 className="size-4 shrink-0" aria-hidden />
            <span className="truncate">Xem bản nháp</span>
            <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            <span className="sr-only">(mở tab mới)</span>
          </a>
        )}
      </div>

      {draft.safety ? (
        <SafetySummary name={draft.title} result={draft.safety} />
      ) : (
        <p className="text-xs text-muted-foreground">Bản nháp dạng link: chưa có kết quả KOL Safety.</p>
      )}

      {draft.note && (
        <p className="rounded-[8px] bg-muted/60 p-2.5 text-sm whitespace-pre-line text-foreground">
          <span className="block text-xs text-muted-foreground">Ghi chú của nhà cung cấp</span>
          {draft.note}
        </p>
      )}
      {draft.feedback && (
        <p className="rounded-[8px] border border-chart-5/40 bg-chart-5/10 p-2.5 text-sm whitespace-pre-line text-foreground">
          <span className="block text-xs text-muted-foreground">Góp ý của bạn</span>
          {draft.feedback}
        </p>
      )}

      {canReview && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Button type="button" className="h-11 md:h-9" disabled={approving} onClick={() => void actions.approve(booking, draft)}>
            {approving ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
            Duyệt
          </Button>
          <Button type="button" variant="outline" className="h-11 md:h-9" disabled={approving} onClick={() => actions.requestChanges(booking, draft)}>
            <PencilLine aria-hidden />
            Yêu cầu sửa
          </Button>
        </div>
      )}
    </article>
  );
}

/** Verified post with its pulled metrics (compact grid). */
export function PostCard({ post, item }: { post: ContentSubmission; item?: BookingItemView }) {
  const m = post.metrics;
  return (
    <article className="space-y-2 rounded-[8px] border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs text-muted-foreground">{itemLine(item)}</p>
          {post.url && (
            <a
              href={href(post.url)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 max-w-full items-center gap-1.5 text-sm font-medium text-primary hover:underline md:min-h-0"
            >
              <span className="truncate">{post.url.replace(/^https?:\/\//, '')}</span>
              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
              <span className="sr-only">(mở tab mới)</span>
            </a>
          )}
        </div>
        <ToneBadge tone="success">Đã xác minh</ToneBadge>
      </div>
      {m && (
        <dl className="grid grid-cols-3 gap-2 text-sm sm:grid-cols-5">
          {[
            ['Lượt xem', formatCompactVi(m.views)],
            ['Thích', formatCompactVi(m.likes)],
            ['Bình luận', formatCompactVi(m.comments)],
            ['Chia sẻ', formatCompactVi(m.shares)],
            ['Tương tác', formatPercent(m.engagementRate)],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-[8px] bg-muted/50 px-2 py-1.5">
              <dt className="truncate text-[11px] text-muted-foreground">{label}</dt>
              <dd className="font-semibold text-foreground tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {post.verifiedAt && <p className="text-xs text-muted-foreground tabular-nums">Xác minh {formatDayTime(post.verifiedAt)}</p>}
    </article>
  );
}
