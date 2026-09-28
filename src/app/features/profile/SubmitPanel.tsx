import { useId, useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, ChevronRight, Loader2, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { PLEDGES_LABEL, reviewService, type OwnerType, type ProfileView } from '../../services';
import { checklistLink } from './primaryAction';

interface SubmitPanelProps {
  ownerType: OwnerType;
  accountId: string;
  view: ProfileView;
  pledges: string[];
  /** Re-submission after NEEDS_FIX. */
  resubmit: boolean;
}

const SUBMIT_ERRORS: Record<string, string> = {
  NOT_ELIGIBLE: 'Hồ sơ chưa đủ điều kiện gửi xét duyệt.',
  NOT_SUBMITTABLE: 'Hồ sơ đã được gửi, vui lòng chờ kết quả.',
};

/** BR-64 / BR-65 checklist (unmet items link to their page) + 3 pledges + submit button (shared by KOL and MCN). */
export function SubmitPanel({ ownerType, accountId, view, pledges, resubmit }: SubmitPanelProps) {
  const baseId = useId();
  const [checked, setChecked] = useState<boolean[]>(() => pledges.map(() => false));
  const [busy, setBusy] = useState(false);
  const allPledged = checked.length === pledges.length && checked.every(Boolean);
  const items = [...view.checklist, { key: 'pledges' as const, label: PLEDGES_LABEL, ok: allPledged }];
  const ready = items.every((i) => i.ok);

  const submit = async () => {
    setBusy(true);
    try {
      await reviewService.submit(accountId, checked);
      toast.success('Đã gửi hồ sơ xét duyệt');
    } catch (e) {
      const key = e instanceof Error ? e.message : '';
      toast.error(SUBMIT_ERRORS[key] ?? (key || 'Đã có lỗi xảy ra. Vui lòng thử lại.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4" data-owner={ownerType}>
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Điều kiện gửi hồ sơ</p>
        <ul className="space-y-1.5">
          {items.map((i) => {
            const to = i.ok ? undefined : checklistLink(ownerType, i.key);
            return (
              <li key={i.key} className="flex items-start gap-2 text-sm">
                {i.ok ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-chart-4" aria-label="Đạt" />
                ) : (
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Chưa đạt" />
                )}
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <span className={i.ok ? 'text-foreground' : 'text-muted-foreground'}>{i.label}</span>
                  {to && (
                    <Link to={to} className="inline-flex items-center font-medium text-primary underline-offset-4 hover:underline">
                      Bổ sung
                      <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-medium text-foreground">Cam đoan</legend>
        {pledges.map((p, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <Checkbox
              id={`${baseId}-${idx}`}
              checked={checked[idx]}
              onCheckedChange={(v) => setChecked((c) => c.map((x, j) => (j === idx ? v === true : x)))}
              aria-labelledby={`${baseId}-${idx}-label`}
              className="mt-0.5"
            />
            <Label id={`${baseId}-${idx}-label`} htmlFor={`${baseId}-${idx}`} className="text-sm leading-snug font-normal text-foreground">
              {p}
            </Label>
          </div>
        ))}
      </fieldset>

      <Button type="button" className="h-11 w-full md:w-auto" disabled={!ready || busy} onClick={() => void submit()}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
        {resubmit ? 'Gửi lại hồ sơ' : 'Gửi xét duyệt'}
      </Button>
    </div>
  );
}
