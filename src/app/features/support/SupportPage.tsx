import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { ChevronRight, Clock, Headset, LifeBuoy, Loader2, MessageCircleQuestion, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { noticeInbox } from '../../services';
import { useAuth } from '../../auth/AuthContext';
import { MESSAGES_PATH, MY_QUESTIONS_PATH, ROLE_CONFIG, SUPPORT_PAGES } from '../../auth/roles';
import { cn } from '../../components/ui/utils';
import { SelectField } from '../shared/SelectField';
import { checkSupportRequest, FAQ, guideSteps, SUPPORT_MESSAGE_MAX, SUPPORT_TOPICS, supportRedirectPath } from './supportContent';

function SectionTitle({ id, children, hint }: { id: string; children: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 id={id} className="text-lg font-semibold text-foreground">
        {children}
      </h2>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SupportForm() {
  const { account } = useAuth();
  const id = useId();
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = checkSupportRequest(topic, message);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError(null);
    setBusy(true);
    await new Promise((res) => setTimeout(res, 400));
    // Demo: the request is "sent" as a confirmation to the account's own email (fake outbox → toast).
    noticeInbox.publish({
      channel: 'email',
      target: account?.email ?? '',
      title: `KOL Hub đã nhận yêu cầu hỗ trợ: ${topic}`,
      body: 'Bộ phận hỗ trợ sẽ phản hồi qua email trong giờ làm việc. Đây là bản demo, yêu cầu không được gửi đi thật.',
    });
    toast.success('Đã gửi yêu cầu hỗ trợ');
    setMessage('');
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <SelectField label="Chủ đề" value={topic} options={[...SUPPORT_TOPICS]} onChange={setTopic} placeholder="Chọn chủ đề" />
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-msg`}>Nội dung</Label>
        <Textarea
          id={`${id}-msg`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={SUPPORT_MESSAGE_MAX}
          rows={4}
          placeholder="Mô tả vấn đề, kèm tên chiến dịch hoặc mã booking nếu có"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        {error && (
          <p id={`${id}-err`} className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" className="h-11 md:h-9" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
        Gửi yêu cầu
      </Button>
    </form>
  );
}

/**
 * Brand only (single "Hỗ trợ" menu item): small links between the three support pages. KOL/MCN have one sidebar item
 * per page, so they do not need them.
 */
function SupportPageLinks() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Các trang hỗ trợ" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0">
      {SUPPORT_PAGES.map((p) => {
        const active = pathname === p.path;
        return (
          <Link
            key={p.path}
            to={p.path}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex h-11 shrink-0 items-center rounded-full border px-3 text-sm whitespace-nowrap transition-colors md:h-8',
              active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-muted',
            )}
          >
            {p.title}
          </Link>
        );
      })}
    </nav>
  );
}

function SupportShell({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  return (
    <div className="@container mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
      {account?.type === 'BIZ' && <SupportPageLinks />}
      {children}
    </div>
  );
}

/** /ho-tro/huong-dan — "Hướng dẫn": step-by-step guide for the role (KOL/MCN and Brand). */
export function SupportGuidePage() {
  const { account } = useAuth();
  const type = account?.type ?? 'KOL';
  const steps = guideSteps(type);
  return (
    <SupportShell>
      <section aria-labelledby="ho-tro-huong-dan">
        <SectionTitle id="ho-tro-huong-dan" hint={type === 'BIZ' ? 'Từ tìm KOL tới thanh toán' : 'Từ kết nối kênh tới nhận thanh toán'}>
          Các bước sử dụng
        </SectionTitle>
        <ol className="grid gap-3 @2xl:grid-cols-2">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-[8px] border border-border bg-card p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground tabular-nums" aria-hidden>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  <span className="sr-only">Bước {i + 1}: </span>
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
                {s.to && s.cta && (
                  <Link to={s.to} className="inline-flex min-h-11 items-center gap-0.5 text-sm font-medium text-primary underline-offset-4 hover:underline md:min-h-7">
                    {s.cta}
                    <ChevronRight className="size-4" aria-hidden />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </SupportShell>
  );
}

/** /ho-tro/faq — "FAQ": accordion of frequent questions (KOL/MCN and Brand). */
export function SupportFaqPage() {
  return (
    <SupportShell>
      <section aria-labelledby="ho-tro-faq">
        <SectionTitle id="ho-tro-faq" hint="Chưa thấy câu trả lời? Gửi yêu cầu ở trang Liên hệ hỗ trợ.">
          Câu hỏi thường gặp
        </SectionTitle>
        <Accordion type="single" collapsible className="rounded-[8px] border border-border bg-card px-4">
          {FAQ.map((f) => (
            <AccordionItem key={f.id} value={f.id}>
              <AccordionTrigger className="min-h-11 text-left">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-xs font-medium text-primary">{f.topic}</span>
                  <span>{f.q}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </SupportShell>
  );
}

/**
 * /ho-tro/lien-he — "Liên hệ": placeholder contact + a demo request form that writes to the fake email outbox.
 * KOL/MCN also get a link to "Câu hỏi của tôi" (questions sent on the Sàn).
 */
export function SupportContactPage() {
  const { account, role } = useAuth();
  const isSupplier = account?.type === 'KOL' || account?.type === 'MCN';
  const messagesLabel = ROLE_CONFIG[role].menu.find((m) => m.path === MESSAGES_PATH)?.label ?? 'Tin nhắn';
  return (
    <SupportShell>
      <section aria-labelledby="ho-tro-lien-he">
        <SectionTitle id="ho-tro-lien-he">Gửi yêu cầu hỗ trợ</SectionTitle>
        <div className="grid gap-4 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-3 rounded-[8px] border border-border bg-muted/30 p-4 text-sm">
            <p className="flex items-start gap-2 text-foreground">
              <Headset className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              Bộ phận hỗ trợ KOL Hub (bản demo: chưa có số điện thoại hay email thật).
            </p>
            <p className="flex items-start gap-2 text-muted-foreground">
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
              Giờ làm việc: 8:30–17:30, thứ Hai đến thứ Sáu.
            </p>
            <p className="flex items-start gap-2 text-muted-foreground">
              <LifeBuoy className="mt-0.5 size-4 shrink-0" aria-hidden />
              Việc liên quan một booking: nhắn trực tiếp cho đối tác trong {messagesLabel} sẽ nhanh hơn.
            </p>
            {isSupplier && (
              <p className="flex items-start gap-2 text-muted-foreground">
                <MessageCircleQuestion className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  Hỏi Nhãn hàng về một chiến dịch trên Sàn?{' '}
                  <Link to={MY_QUESTIONS_PATH} className="font-medium text-primary underline-offset-4 hover:underline">
                    Câu hỏi bạn đã gửi trên Sàn
                  </Link>
                </span>
              </p>
            )}
          </div>
          <div className="rounded-[8px] border border-border bg-card p-4">
            <SupportForm />
          </div>
        </div>
      </section>
    </SupportShell>
  );
}

/** /ho-tro → "Hướng dẫn"; old anchors keep working (#lien-he → Liên hệ, #ho-tro-faq → FAQ). */
export function SupportIndexRedirect() {
  const { hash } = useLocation();
  return <Navigate to={supportRedirectPath(hash)} replace />;
}
