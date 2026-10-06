import { useId, useState } from 'react';
import { Link } from 'react-router';
import { Loader2, MessageCircleQuestion } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../components/ui/utils';
import { campaignService, QA_QUESTION_MAX } from '../../services';
import { useLiveQuery } from '../shared/useLiveQuery';
import { errText } from './parts';
import { brandCampaignPath, formatDateTime, loginToApplyPath, type MarketplaceViewer } from './supplierBooking';

/**
 * Public "Hỏi đáp" of a marketplace campaign: answered questions for everyone (guests included), plus the viewer's
 * own pending ones. Signed-in KOL/MCN can ask; the owning brand answers from its campaign page.
 */
export function CampaignQASection({ campaignId, viewer, mine, canAsk }: { campaignId: string; viewer: MarketplaceViewer; mine?: boolean; canAsk: boolean }) {
  const id = useId();
  const q = useLiveQuery(() => campaignService.listQuestions(campaignId), [campaignId, viewer]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const list = q.data ?? [];

  const ask = async () => {
    setBusy(true);
    try {
      await campaignService.askQuestion(campaignId, text);
      setText('');
      toast.success('Đã gửi câu hỏi', { description: 'Câu hỏi hiển thị công khai khi Nhãn hàng trả lời.' });
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {q.loading && !q.data ? (
        <p className="text-sm text-muted-foreground">Đang tải hỏi đáp…</p>
      ) : list.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageCircleQuestion className="size-4 shrink-0" aria-hidden />
          Chưa có câu hỏi nào được trả lời.
        </p>
      ) : (
        <ul className="space-y-3" aria-label="Hỏi đáp">
          {list.map((x) => (
            <li key={x.id} className={cn('space-y-2 rounded-[8px] border border-border p-3', x.mine && 'border-primary/30')}>
              <div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Hỏi</span> · {x.mine ? 'Bạn' : x.askerName} · {formatDateTime(x.createdAt)}
                </p>
                <p className="text-sm break-words whitespace-pre-line text-foreground">{x.question}</p>
              </div>
              {x.answer ? (
                <div className="rounded-[8px] bg-primary/5 p-2.5">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-primary">Nhãn hàng trả lời</span>
                    {x.answeredAt ? ` · ${formatDateTime(x.answeredAt)}` : ''}
                  </p>
                  <p className="text-sm break-words whitespace-pre-line text-foreground">{x.answer}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  {viewer === 'brand' ? 'Chưa trả lời.' : 'Chờ Nhãn hàng trả lời — chỉ bạn thấy câu hỏi này cho tới khi được trả lời.'}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {viewer === 'supplier' && canAsk && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-q`}>Đặt câu hỏi cho Nhãn hàng</Label>
          <Textarea
            id={`${id}-q`}
            rows={2}
            maxLength={QA_QUESTION_MAX}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="VD: Có cần gắn link sản phẩm trong phần mô tả không?"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Câu hỏi và câu trả lời hiển thị công khai trên Sàn.</p>
            <Button type="button" className="h-11 md:h-9" disabled={busy || !text.trim()} onClick={() => void ask()}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              Gửi câu hỏi
            </Button>
          </div>
        </div>
      )}
      {viewer === 'guest' && (
        <p className="text-sm text-muted-foreground">
          <Link to={loginToApplyPath(campaignId)} className="font-medium text-primary underline-offset-4 hover:underline">
            Đăng nhập
          </Link>{' '}
          bằng tài khoản KOL hoặc MCN để đặt câu hỏi.
        </p>
      )}
      {viewer === 'brand' && mine && (
        <Link to={`${brandCampaignPath(campaignId)}?tab=hoi-dap`} className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}>
          Trả lời câu hỏi
        </Link>
      )}
    </div>
  );
}
