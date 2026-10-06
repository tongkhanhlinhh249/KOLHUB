import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronRight, Clock, Headset, LifeBuoy, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { noticeInbox } from '../../services';
import { useAuth } from '../../auth/AuthContext';
import { SelectField } from '../shared/SelectField';
import { checkSupportRequest, FAQ, guideSteps, SUPPORT_MESSAGE_MAX, SUPPORT_TOPICS } from './supportContent';

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
 * /ho-tro — "Hỗ trợ" (KOL/MCN and Brand): step-by-step guide for the role, FAQ accordion and "Liên hệ hỗ trợ"
 * (placeholder contact + a demo request form that writes to the fake email outbox). #lien-he scrolls to the form.
 */
export function SupportPage() {
  const { account } = useAuth();
  const { hash } = useLocation();
  const type = account?.type ?? 'KOL';
  const steps = guideSteps(type);

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    el?.scrollIntoView({ block: 'start' });
  }, [hash]);

  return (
    <div className="@container mx-auto w-full max-w-4xl space-y-8 p-4 md:p-6">
      <section aria-labelledby="ho-tro-huong-dan">
        <SectionTitle id="ho-tro-huong-dan" hint={type === 'BIZ' ? 'Từ tìm KOL tới thanh toán' : 'Từ kết nối kênh tới nhận thanh toán'}>
          Hướng dẫn sử dụng
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

      <section aria-labelledby="ho-tro-faq">
        <SectionTitle id="ho-tro-faq" hint="Chiến dịch, thanh toán, phần thưởng sản phẩm, KOL Safety, MCN và vi phạm">
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

      <section id="lien-he" aria-labelledby="ho-tro-lien-he" className="scroll-mt-4">
        <SectionTitle id="ho-tro-lien-he">Liên hệ hỗ trợ</SectionTitle>
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
              Việc liên quan một booking: nhắn trực tiếp cho đối tác trong Tin nhắn sẽ nhanh hơn.
            </p>
          </div>
          <div className="rounded-[8px] border border-border bg-card p-4">
            <SupportForm />
          </div>
        </div>
      </section>
    </div>
  );
}
