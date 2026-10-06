import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AlertCircle, ArrowLeft, Building2, ExternalLink, Link2, Loader2, MessagesSquare, RotateCcw, Search, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import { BOOKING_STATUS_LABEL, inboxService, MESSAGE_TEXT_MAX, type ThreadSummary, type ThreadView } from '../../services';
import { useAuth } from '../../auth/AuthContext';
import { CampaignCover } from '../shared/CampaignCover';
import { ToneBadge } from '../shared/StatusBadges';
import { useLiveQuery } from '../shared/useLiveQuery';
import { errText } from '../supplier-booking/parts';
import { withParam } from '../supplier-booking/supplierBooking';
import { badgeText, bubbleTime, shortTime, THREAD_PARAM, threadStatusTone } from './inboxView';

const COUNTERPART_LABEL: Record<ThreadSummary['counterpartType'], string> = { BRAND: 'Nhãn hàng', KOL: 'KOL', MCN: 'MCN' };

function Unread({ n, className }: { n: number; className?: string }) {
  const t = badgeText(n);
  if (!t) return null;
  return (
    <span className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground tabular-nums', className)}>
      <span className="sr-only">{n} tin chưa đọc: </span>
      {t}
    </span>
  );
}

function ThreadRow({ t, active, now, onOpen }: { t: ThreadSummary; active: boolean; now: number; onOpen(): void }) {
  const preview = t.last ? `${t.last.kind === 'USER' && t.last.mine ? 'Bạn: ' : ''}${t.last.text}` : 'Chưa có tin nhắn';
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex w-full min-w-0 items-start gap-3 px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset',
        active ? 'bg-primary/10' : 'hover:bg-muted/60',
      )}
    >
      <CampaignCover cover={t.cover} className="aspect-square size-12 shrink-0 rounded-[8px]" iconClassName="size-5" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cn('min-w-0 flex-1 truncate text-sm text-foreground', t.unread > 0 ? 'font-semibold' : 'font-medium')}>{t.counterpartName}</span>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{shortTime(t.lastAt, now)}</span>
        </span>
        <span className="block truncate text-xs text-muted-foreground">{t.campaignName}</span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className={cn('min-w-0 flex-1 truncate text-sm', t.unread > 0 ? 'text-foreground' : 'text-muted-foreground', t.last?.kind === 'SYSTEM' && 'italic')}>{preview}</span>
          <Unread n={t.unread} className="shrink-0" />
        </span>
      </span>
    </button>
  );
}

function Composer({ thread }: { thread: ThreadView }) {
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setText('');
    setLink('');
    setShowLink(false);
  }, [thread.bookingId]);

  if (!thread.canPost) {
    return (
      <p className="border-t border-border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
        Booking đã kết thúc ({BOOKING_STATUS_LABEL[thread.status].toLowerCase()}). Bạn vẫn xem được lịch sử trao đổi.
      </p>
    );
  }

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await inboxService.send(thread.bookingId, { text, ...(link.trim() ? { link } : {}) });
      setText('');
      setLink('');
      setShowLink(false);
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2 border-t border-border bg-card px-3 py-3 md:px-4">
      {showLink && (
        <div className="flex items-center gap-2">
          <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            type="url"
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://… (brief, bản nháp, thư mục chia sẻ)"
            aria-label="Đường dẫn đính kèm"
            className="h-11 md:h-9"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 md:size-9"
            aria-label="Bỏ đường dẫn"
            onClick={() => {
              setShowLink(false);
              setLink('');
            }}
          >
            <X aria-hidden />
          </Button>
        </div>
      )}
      <div className="flex items-end gap-2">
        {!showLink && (
          <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 md:size-9" aria-label="Đính kèm đường dẫn" title="Đính kèm đường dẫn" onClick={() => setShowLink(true)}>
            <Link2 aria-hidden />
          </Button>
        )}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          maxLength={MESSAGE_TEXT_MAX}
          rows={1}
          placeholder={`Nhắn cho ${thread.counterpartName}…`}
          aria-label="Nội dung tin nhắn"
          className="max-h-40 min-h-11 flex-1 resize-none md:min-h-9"
        />
        <Button type="submit" size="icon" className="size-11 shrink-0 md:size-9" disabled={busy || !text.trim()} aria-label="Gửi tin nhắn">
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
        </Button>
      </div>
      <p className="hidden text-xs text-muted-foreground md:block">Enter để gửi, Shift + Enter để xuống dòng. Chỉ hai bên của booking xem được cuộc trò chuyện này.</p>
    </form>
  );
}

function ThreadPane({ bookingId, onBack }: { bookingId: string; onBack(): void }) {
  const { account } = useAuth();
  const q = useLiveQuery(() => inboxService.getThread(bookingId), [bookingId, account?.id]);
  const t = q.data && q.data.bookingId === bookingId ? q.data : undefined;
  const endRef = useRef<HTMLDivElement>(null);
  const now = Date.now();
  const count = t?.messages.length ?? 0;

  // Opening the thread reads it (its message notifications too).
  useEffect(() => {
    if (t && t.unread > 0) void inboxService.markThreadRead(bookingId).catch(() => undefined);
  }, [bookingId, t?.unread]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [count, bookingId]);

  let body: ReactNode;
  if (!t && !q.error) {
    body = (
      <div className="space-y-3 p-4" aria-busy="true" aria-label="Đang tải cuộc trò chuyện">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="ml-auto h-10 w-1/2" />
        <Skeleton className="h-10 w-3/5" />
      </div>
    );
  } else if (!t) {
    body = (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{errText(q.error)}</span>
            <Button type="button" variant="outline" size="sm" className="h-11 md:h-8" onClick={q.reload}>
              <RotateCcw aria-hidden />
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  } else {
    body = (
      <ol className="flex flex-col gap-3 px-3 py-4 md:px-5" aria-label="Tin nhắn">
        {t.messages.map((m) =>
          m.kind === 'SYSTEM' ? (
            <li key={m.id} className="flex justify-center">
              <span className="max-w-[90%] rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground">
                {m.text} · <span className="tabular-nums">{bubbleTime(m.at, now)}</span>
              </span>
            </li>
          ) : (
            <li key={m.id} className={cn('flex flex-col gap-1', m.mine ? 'items-end' : 'items-start')}>
              <span className="px-1 text-xs text-muted-foreground">
                {m.authorName} · <span className="tabular-nums">{bubbleTime(m.at, now)}</span>
              </span>
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap md:max-w-[70%]',
                  m.mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted text-foreground',
                )}
              >
                {m.text}
                {m.link && (
                  <a
                    href={m.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn('mt-1.5 flex items-center gap-1 text-xs font-medium underline underline-offset-2 break-all', m.mine ? 'text-primary-foreground' : 'text-primary')}
                  >
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                    {m.link}
                  </a>
                )}
              </div>
            </li>
          ),
        )}
        <div ref={endRef} />
      </ol>
    );
  }

  return (
    // Phones: fills the space between the top bar (3.5rem) and the tab bar (4.5rem); messages scroll inside.
    <section className="flex h-[calc(100dvh-8rem-env(safe-area-inset-bottom))] min-w-0 flex-1 flex-col md:h-auto md:min-h-0" aria-label="Cuộc trò chuyện">
      <header className="flex items-center gap-3 border-b border-border bg-card px-3 py-2.5 md:px-4">
        <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 md:hidden" aria-label="Quay lại danh sách tin nhắn" onClick={onBack}>
          <ArrowLeft aria-hidden />
        </Button>
        {t ? (
          <>
            <CampaignCover cover={t.cover} className="hidden aspect-square size-10 shrink-0 rounded-[8px] sm:block" iconClassName="size-4" />
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
                {t.counterpartType === 'BRAND' && <Building2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
                <span className="truncate">{t.counterpartName}</span>
                <span className="shrink-0 text-xs font-normal text-muted-foreground">· {COUNTERPART_LABEL[t.counterpartType]}</span>
              </p>
              <p className="truncate text-xs text-muted-foreground">{t.campaignName}</p>
            </div>
            <ToneBadge tone={threadStatusTone(t.status)} className="hidden shrink-0 lg:inline-flex">
              {BOOKING_STATUS_LABEL[t.status]}
            </ToneBadge>
            <Link to={t.bookingPath} className={buttonVariants({ variant: 'outline', size: 'sm', className: 'h-11 shrink-0 md:h-8' })}>
              <span className="hidden sm:inline">Mở booking</span>
              <span className="sm:hidden">Booking</span>
            </Link>
          </>
        ) : (
          <Skeleton className="h-8 flex-1" />
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{body}</div>
      {t && <Composer thread={t} />}
    </section>
  );
}

/**
 * /tin-nhan — one conversation per booking between the brand and the KOL/MCN (no free-form DMs). Desktop: inbox list
 * on the left, thread on the right (?thread=<bookingId>); phones: the list, or the thread as its own view.
 * The thread mixes messages with system messages for key booking events and links to the booking.
 */
export function MessagesPage() {
  const { account } = useAuth();
  const [params, setParams] = useSearchParams();
  const active = params.get(THREAD_PARAM);
  const [keyword, setKeyword] = useState('');
  const q = useLiveQuery(() => inboxService.listThreads(), [account?.id]);
  const now = Date.now();
  const all = q.data;
  const kw = keyword.trim().toLowerCase();
  const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();
  const list = all && kw ? all.filter((t) => fold(`${t.campaignName} ${t.counterpartName} ${t.last?.text ?? ''}`).includes(fold(kw))) : all;

  const open = (id: string | null) => setParams((prev) => withParam(prev, THREAD_PARAM, id));

  // Desktop with nothing selected: open the newest thread.
  useEffect(() => {
    if (!active && all && all.length > 0 && window.matchMedia('(min-width: 768px)').matches) {
      setParams((prev) => withParam(prev, THREAD_PARAM, all[0].bookingId), { replace: true });
    }
  }, [active, all, setParams]);

  let listBody: ReactNode;
  if (q.loading && !all) {
    listBody = (
      <div className="space-y-2 p-3" aria-busy="true" aria-label="Đang tải tin nhắn">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  } else if (q.error && !all) {
    listBody = (
      <div className="p-3">
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>Không tải được tin nhắn.</span>
            <Button type="button" variant="outline" size="sm" className="h-11 md:h-8" onClick={q.reload}>
              <RotateCcw aria-hidden />
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  } else if (all && all.length === 0) {
    listBody = (
      <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessagesSquare className="size-6" aria-hidden />
        </div>
        <p className="font-semibold text-foreground">Chưa có cuộc trò chuyện</p>
        <p className="max-w-xs text-sm text-muted-foreground">Mỗi booking (lời mời hoặc đề xuất ứng tuyển) có một cuộc trò chuyện riêng giữa Nhãn hàng và KOL/MCN.</p>
      </div>
    );
  } else if (list && list.length === 0) {
    listBody = <p className="px-4 py-10 text-center text-sm text-muted-foreground">Không có cuộc trò chuyện nào khớp “{keyword.trim()}”.</p>;
  } else if (list) {
    listBody = (
      <ul className="divide-y divide-border" aria-label="Cuộc trò chuyện">
        {list.map((t) => (
          <li key={t.bookingId}>
            <ThreadRow t={t} active={t.bookingId === active} now={now} onOpen={() => open(t.bookingId)} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex w-full min-w-0 md:h-full">
      <aside className={cn('w-full min-w-0 flex-col border-border md:flex md:w-80 md:shrink-0 md:border-r lg:w-96', active ? 'hidden' : 'flex')} aria-label="Hộp thư">
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm chiến dịch, đối tác, nội dung"
              aria-label="Tìm cuộc trò chuyện"
              className="h-11 pl-9 md:h-9"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 md:overflow-y-auto">{listBody}</div>
      </aside>
      <div className={cn('min-w-0 flex-1 md:flex', active ? 'flex' : 'hidden')}>
        {active ? (
          <ThreadPane bookingId={active} onBack={() => open(null)} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <MessagesSquare className="size-8" aria-hidden />
            <p className="text-sm">Chọn một cuộc trò chuyện để xem tin nhắn.</p>
          </div>
        )}
      </div>
    </div>
  );
}
