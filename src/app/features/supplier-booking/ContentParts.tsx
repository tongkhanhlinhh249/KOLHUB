import { useState } from 'react';
import { AlertTriangle, ExternalLink, FileVideo, Info, MessageSquareWarning } from 'lucide-react';
import { cn } from '../../components/ui/utils';
import {
  CONTENT_STATUS_LABEL,
  issueSummary,
  type BookingItemView,
  type ContentStatus,
  type ContentSubmission,
  type ScanResult,
} from '../../services';
import { formatCompactVi } from '../biz-search/format';
import { IssuesSheet, ScoreChip, VerdictPill } from '../safety/SafetyParts';
import { formatFileSize } from '../shared/files';
import { ToneBadge, type Tone } from '../shared/StatusBadges';
import { formatDateTime } from './supplierBooking';

const CONTENT_TONE: Record<ContentStatus, Tone> = { PENDING: 'info', CHANGES_REQUESTED: 'warning', APPROVED: 'success' };

/** KOL Safety verdict, score and an issues button (opens the shared issues sheet). */
export function SafetyResult({ name, result }: { name: string; result: ScanResult }) {
  const [open, setOpen] = useState(false);
  const summary = issueSummary(result.issues);
  const problems = result.issues.some((i) => i.severity !== 'note');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <VerdictPill verdict={result.verdict} />
      <ScoreChip result={result} />
      {summary ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className={cn(
              'inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:min-h-7',
              problems ? 'bg-destructive/10 text-foreground hover:bg-destructive/15' : 'bg-muted text-foreground hover:bg-muted/70',
            )}
          >
            {problems ? <AlertTriangle className="size-3.5 text-destructive" aria-hidden /> : <Info className="size-3.5 text-muted-foreground" aria-hidden />}
            {summary}
            <span className="sr-only">— xem chi tiết</span>
          </button>
          <IssuesSheet open={open} onOpenChange={setOpen} name={name} result={result} />
        </>
      ) : (
        <span className="text-xs text-muted-foreground">Không có vấn đề</span>
      )}
    </div>
  );
}

function ExtLink({ url, label }: { url: string; label?: string }) {
  const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 max-w-full items-center gap-1 text-sm text-primary underline-offset-4 hover:underline md:min-h-0"
    >
      <span className="truncate">{label ?? url}</span>
      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only">(mở tab mới)</span>
    </a>
  );
}

/** Metrics pulled when a post link is verified. */
export function PostResult({ post }: { post: ContentSubmission }) {
  const m = post.metrics;
  return (
    <div className="space-y-3">
      {post.url && <ExtLink url={post.url} />}
      {m && (
        <dl className="grid grid-cols-2 gap-2 @sm:grid-cols-5">
          {[
            ['Lượt xem', formatCompactVi(m.views)],
            ['Thích', formatCompactVi(m.likes)],
            ['Bình luận', formatCompactVi(m.comments)],
            ['Chia sẻ', formatCompactVi(m.shares)],
            ['Tương tác', `${String(m.engagementRate).replace('.', ',')}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[8px] bg-muted/60 p-2.5">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-sm font-semibold text-foreground tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {post.verifiedAt && <p className="text-xs text-muted-foreground">Xác minh lúc {formatDateTime(post.verifiedAt)}</p>}
    </div>
  );
}

/** One submitted draft: title, target item, file / link, KOL Safety result, brand feedback. */
export function DraftCard({ draft, item, round }: { draft: ContentSubmission; item?: BookingItemView; round: number }) {
  return (
    <li className="space-y-3 rounded-[8px] border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold break-words text-foreground">{draft.title}</p>
          <p className="text-xs text-muted-foreground">
            Bản nháp {round} · {item ? item.displayName : 'Toàn bộ booking'} · {formatDateTime(draft.submittedAt)}
          </p>
        </div>
        <ToneBadge tone={CONTENT_TONE[draft.status]}>{CONTENT_STATUS_LABEL[draft.status]}</ToneBadge>
      </div>
      {draft.file && (
        <div className="flex items-center gap-3">
          {draft.file.thumbnail ? (
            <img src={draft.file.thumbnail} alt="" className="h-16 w-12 shrink-0 rounded-md object-cover" />
          ) : (
            <span className="grid h-16 w-12 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
              <FileVideo className="size-5" aria-hidden />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm text-foreground">{draft.file.name}</span>
            <span className="block text-xs text-muted-foreground">{formatFileSize(draft.file.size)}</span>
          </span>
        </div>
      )}
      {draft.url && <ExtLink url={draft.url} label="Link xem trước" />}
      {draft.safety && <SafetyResult name={draft.file?.name ?? draft.title} result={draft.safety} />}
      {draft.note && <p className="text-sm break-words whitespace-pre-line text-muted-foreground">Ghi chú: {draft.note}</p>}
      {draft.feedback && (
        <div
          className={cn(
            'flex gap-2 rounded-[8px] p-3 text-sm',
            draft.status === 'CHANGES_REQUESTED' ? 'bg-chart-5/15 text-foreground' : 'bg-muted text-foreground',
          )}
        >
          <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-chart-5" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium">Góp ý của Nhãn hàng</p>
            <p className="break-words whitespace-pre-line">{draft.feedback}</p>
          </div>
        </div>
      )}
    </li>
  );
}

export function PostCard({ post, item }: { post: ContentSubmission; item?: BookingItemView }) {
  return (
    <li className="@container space-y-2 rounded-[8px] border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold break-words text-foreground">{post.title}</p>
          {item && <p className="text-xs text-muted-foreground">{item.displayName}</p>}
        </div>
        <ToneBadge tone="success">Đã xác minh</ToneBadge>
      </div>
      <PostResult post={post} />
    </li>
  );
}
