import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AlertCircle, Building2, ChevronRight, MessageCircleQuestion, RotateCcw, Store } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import { inboxService, type MyQuestion, type MyQuestionFilter } from '../../services';
import { MARKETPLACE_PATH } from '../../auth/roles';
import { useAuth } from '../../auth/AuthContext';
import { CampaignCover } from '../shared/CampaignCover';
import { ToneBadge } from '../shared/StatusBadges';
import { useLiveQuery } from '../shared/useLiveQuery';
import { formatDateTime, marketplaceCampaignPath, withParam } from '../supplier-booking/supplierBooking';

const FILTERS: { key: MyQuestionFilter; param: string | null; label: string }[] = [
  { key: 'all', param: null, label: 'Tất cả' },
  { key: 'pending', param: 'cho-tra-loi', label: 'Chờ trả lời' },
  { key: 'answered', param: 'da-tra-loi', label: 'Đã trả lời' },
];
const PARAM = 'trang-thai';

/** ?trang-thai=cho-tra-loi | da-tra-loi (default all). */
export function parseQuestionFilter(p: URLSearchParams): MyQuestionFilter {
  const v = p.get(PARAM);
  return FILTERS.find((f) => f.param && f.param === v)?.key ?? 'all';
}

const chip = (active: boolean) =>
  cn(
    'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors md:h-8',
    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-muted',
  );

function QuestionCard({ q }: { q: MyQuestion }) {
  return (
    <Card className="gap-3 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <CampaignCover cover={q.cover} className="aspect-square w-14 shrink-0 rounded-[6px] md:w-16" iconClassName="size-4" />
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{q.brandCompany}</span>
          </p>
          <h2 className="line-clamp-2 text-sm leading-snug font-semibold text-foreground md:text-base">{q.campaignName}</h2>
        </div>
        <ToneBadge tone={q.status === 'ANSWERED' ? 'success' : 'warning'} className="shrink-0">
          {q.status === 'ANSWERED' ? 'Đã trả lời' : 'Chờ trả lời'}
        </ToneBadge>
      </div>
      <div className="space-y-2 text-sm">
        <div className="rounded-[8px] bg-muted/50 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground">Bạn hỏi · {formatDateTime(q.createdAt)}</p>
          <p className="mt-0.5 break-words whitespace-pre-wrap text-foreground">{q.question}</p>
        </div>
        {q.answer ? (
          <div className="rounded-[8px] border-l-2 border-primary bg-primary/5 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">Nhãn hàng trả lời{q.answeredAt ? ` · ${formatDateTime(q.answeredAt)}` : ''}</p>
            <p className="mt-0.5 break-words whitespace-pre-wrap text-foreground">{q.answer}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nhãn hàng chưa trả lời. Bạn sẽ nhận thông báo khi có câu trả lời.</p>
        )}
      </div>
      <Link
        to={`${marketplaceCampaignPath(q.campaignId)}#hoi-dap`}
        className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-primary underline-offset-4 hover:underline md:min-h-8"
      >
        Xem chiến dịch
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </Card>
  );
}

/** /cau-hoi-cua-toi — questions the KOL / MCN asked on Sàn campaigns, pending first, with the brand's answer. */
export function MyQuestionsPage() {
  const { account } = useAuth();
  const [params, setParams] = useSearchParams();
  const filter = parseQuestionFilter(params);
  const q = useLiveQuery(() => inboxService.listMyQuestions(), [account?.id]);
  const all = q.data;
  const counts = {
    all: all?.length ?? 0,
    pending: all?.filter((x) => x.status === 'PENDING').length ?? 0,
    answered: all?.filter((x) => x.status === 'ANSWERED').length ?? 0,
  };
  const list = all?.filter((x) => filter === 'all' || (filter === 'pending' ? x.status === 'PENDING' : x.status === 'ANSWERED'));

  let body: ReactNode;
  if (q.loading && !all) {
    body = (
      <div className="space-y-3" aria-busy="true" aria-label="Đang tải câu hỏi">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  } else if (q.error && !all) {
    body = (
      <Alert variant="destructive">
        <AlertCircle className="size-4" aria-hidden />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>Không tải được câu hỏi.</span>
          <Button type="button" variant="outline" size="sm" className="h-11 md:h-8" onClick={q.reload}>
            <RotateCcw aria-hidden />
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else if (all && all.length === 0) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-border px-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageCircleQuestion className="size-6" aria-hidden />
        </div>
        <p className="font-semibold text-foreground">Bạn chưa đặt câu hỏi nào</p>
        <p className="max-w-md text-sm text-muted-foreground">Mở một chiến dịch trên Sàn, vào mục Hỏi đáp để hỏi Nhãn hàng trước khi ứng tuyển.</p>
        <Link to={MARKETPLACE_PATH} className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}>
          <Store aria-hidden />
          Xem Sàn chiến dịch
        </Link>
      </div>
    );
  } else if (list && list.length === 0) {
    body = <p className="rounded-[8px] border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">Không có câu hỏi nào ở mục này.</p>;
  } else if (list) {
    body = (
      <ul className="flex flex-col gap-3" aria-label="Câu hỏi của tôi">
        {list.map((x) => (
          <li key={x.id}>
            <QuestionCard q={x} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
      {all && all.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0" role="group" aria-label="Lọc câu hỏi">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" className={chip(filter === f.key)} aria-pressed={filter === f.key} onClick={() => setParams((p) => withParam(p, PARAM, f.param), { replace: true })}>
              {f.label}
              <span className={cn('text-xs tabular-nums', filter === f.key ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{counts[f.key]}</span>
            </button>
          ))}
        </div>
      )}
      {body}
    </div>
  );
}
