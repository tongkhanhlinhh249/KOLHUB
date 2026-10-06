import { useId, useState, type ReactNode } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { VIOLATION_SOURCE_LABEL, violationService, type Violation } from '../services';
import { PlatformIcon } from '../features/biz-search/PlatformIcon';
import { useLiveQuery } from '../features/shared/useLiveQuery';
import { ReasonDialog } from '../features/violations/ReasonDialog';
import { formatDay, SeverityBadge } from '../features/violations/ViolationParts';
import { DemoPanelSection } from './DemoPanelSection';

type Decision = { v: Violation; kind: 'dismiss' | 'accept' | 'reject' };

const DECISION_UI: Record<Decision['kind'], { title: string; confirm: string; ok: string; placeholder: string }> = {
  dismiss: {
    title: 'Bác bỏ báo cáo vi phạm',
    confirm: 'Bác bỏ',
    ok: 'Đã bác bỏ báo cáo',
    placeholder: 'Ví dụ: Nội dung không vi phạm tiêu chuẩn cộng đồng',
  },
  accept: {
    title: 'Chấp nhận khiếu nại',
    confirm: 'Chấp nhận',
    ok: 'Đã chấp nhận khiếu nại, vi phạm được gỡ',
    placeholder: 'Ví dụ: Chủ kênh đã cung cấp giấy phép sử dụng nhạc',
  },
  reject: {
    title: 'Từ chối khiếu nại',
    confirm: 'Từ chối',
    ok: 'Đã từ chối khiếu nại',
    placeholder: 'Ví dụ: Chưa có căn cứ chứng minh quyền sử dụng',
  },
};

function Group({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:min-h-8"
      >
        <span className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
          <Badge variant={count ? 'default' : 'secondary'} className="px-1.5 py-0 tabular-nums">
            {count}
          </Badge>
        </span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div id={id} className="space-y-2">
          {count === 0 ? <p className="text-xs text-muted-foreground">Không có mục nào</p> : children}
        </div>
      )}
    </div>
  );
}

function Item({ v, children }: { v: Violation; children: ReactNode }) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-start gap-2">
        <PlatformIcon platform={v.platform} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{v.contentTitle}</p>
          <p className="truncate text-xs text-muted-foreground">
            @{v.channelHandle} · {v.ownerType === 'KOL' ? (v.kolId ?? 'KOL') : 'MCN'} · {VIOLATION_SOURCE_LABEL[v.source]} · {formatDay(v.detectedAt)}
          </p>
          {v.reporter && (
            <p className="truncate text-xs text-muted-foreground">
              Báo cáo từ Nhãn hàng/Agency{v.reporter.company ? ` · ${v.reporter.company}` : ''}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <SeverityBadge severity={v.severity} />
        <span className="text-foreground">{v.category}</span>
      </div>
      {children}
    </div>
  );
}

const Quote = ({ label, text }: { label: string; text: string }) => (
  <p className="rounded-md bg-muted/60 p-2 text-xs text-foreground">
    <span className="text-muted-foreground">{label}: </span>
    {text}
  </p>
);

/** Demo Panel block "Duyệt báo cáo vi phạm": Admin confirms/dismisses reports and decides appeals. */
export function ViolationReviewBlock() {
  const q = useLiveQuery(() => violationService.adminQueue(), []);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const confirm = async (v: Violation) => {
    setBusyId(v.id);
    try {
      await violationService.confirm(v.id);
      toast.success('Đã xác nhận vi phạm', { description: 'Chủ kênh cần khắc phục hoặc khiếu nại; Nhãn hàng sẽ thấy vi phạm này.' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Đã có lỗi xảy ra.');
    } finally {
      setBusyId(null);
    }
  };

  const decide = async (text: string) => {
    if (!decision) return;
    const { v, kind } = decision;
    if (kind === 'dismiss') await violationService.dismiss(v.id, text);
    else if (kind === 'accept') await violationService.acceptAppeal(v.id, text);
    else await violationService.rejectAppeal(v.id, text);
    toast.success(DECISION_UI[kind].ok);
  };

  const ui = decision ? DECISION_UI[decision.kind] : null;

  return (
    <DemoPanelSection
      title="Vi phạm"
      count={q.data ? q.data.pending.length + q.data.appealed.length : undefined}
      description="Xác minh báo cáo, xử lý khiếu nại."
    >
      {!q.data ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <Group title="Chờ xác minh" count={q.data.pending.length}>
            {q.data.pending.map((v) => (
              <Item key={v.id} v={v}>
                {v.reporterNote && <Quote label="Báo cáo" text={v.reporterNote} />}
                <div className="flex gap-2">
                  <Button type="button" size="sm" className="h-11 flex-1 md:h-8" disabled={busyId === v.id} onClick={() => void confirm(v)}>
                    {busyId === v.id && <Loader2 className="animate-spin" aria-hidden />}
                    Xác nhận
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-11 flex-1 md:h-8" onClick={() => setDecision({ v, kind: 'dismiss' })}>
                    Bác bỏ
                  </Button>
                </div>
              </Item>
            ))}
          </Group>
          <Group title="Khiếu nại chờ xử lý" count={q.data.appealed.length}>
            {q.data.appealed.map((v) => (
              <Item key={v.id} v={v}>
                {v.appealReason && <Quote label="Khiếu nại" text={v.appealReason} />}
                <div className="flex gap-2">
                  <Button type="button" size="sm" className="h-11 flex-1 md:h-8" onClick={() => setDecision({ v, kind: 'accept' })}>
                    Chấp nhận khiếu nại
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-11 flex-1 md:h-8" onClick={() => setDecision({ v, kind: 'reject' })}>
                    Từ chối khiếu nại
                  </Button>
                </div>
              </Item>
            ))}
          </Group>
        </div>
      )}
      <ReasonDialog
        open={decision !== null}
        onOpenChange={(o) => !o && setDecision(null)}
        title={ui?.title ?? ''}
        description={decision ? `“${decision.v.contentTitle}” · lý do sẽ được gửi tới chủ kênh.` : undefined}
        label="Lý do"
        placeholder={ui?.placeholder ?? ''}
        confirmLabel={ui?.confirm ?? ''}
        destructive={decision?.kind === 'dismiss'}
        onConfirm={decide}
      />
    </DemoPanelSection>
  );
}
