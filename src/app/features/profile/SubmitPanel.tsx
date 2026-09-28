import { useId, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { reviewService, type OwnerType } from '../../services';
import { overviewProgress, type OverviewSection } from './overviewSections';

interface SubmitPanelProps {
  ownerType: OwnerType;
  accountId: string;
  /** "Tổng quan hồ sơ" sections (same checklist items as the submit guard). */
  sections: OverviewSection[];
  pledges: string[];
  /** Re-submission after NEEDS_FIX. */
  resubmit: boolean;
}

const SUBMIT_ERRORS: Record<string, string> = {
  NOT_ELIGIBLE: 'Hồ sơ chưa đủ điều kiện gửi xét duyệt.',
  NOT_SUBMITTABLE: 'Hồ sơ đã được gửi, vui lòng chờ kết quả.',
};

/** Bring a "Tổng quan hồ sơ" card into view and move focus to it. */
function focusSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  el.focus({ preventScroll: true });
}

/**
 * Submit card body (shared by KOL and MCN): how many overview items are still missing (jumps to the first
 * incomplete section card), the 3 pledges and the submit button — enabled only when every section is
 * "Đã đủ" and all pledges are ticked.
 */
export function SubmitPanel({ ownerType, accountId, sections, pledges, resubmit }: SubmitPanelProps) {
  const baseId = useId();
  const [checked, setChecked] = useState<boolean[]>(() => pledges.map(() => false));
  const [busy, setBusy] = useState(false);
  const allPledged = checked.length === pledges.length && checked.every(Boolean);
  const { missing, firstIncomplete } = overviewProgress(sections);
  const missingLabels = sections.flatMap((s) => s.items.filter((i) => !i.ok).map((i) => i.label));
  const ready = missing === 0 && allPledged;

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

      {missing > 0 ? (
        <div className="space-y-2 rounded-lg border border-chart-5/50 bg-chart-5/10 p-3" role="status">
          <p className="flex items-start gap-2 text-sm font-medium text-foreground">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-chart-5" aria-hidden />
            Còn {missing} mục cần bổ sung
          </p>
          <p className="text-sm text-muted-foreground">{missingLabels.join(' · ')}</p>
          {firstIncomplete && (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full bg-card sm:w-auto md:h-9"
              onClick={() => focusSection(firstIncomplete.anchorId)}
            >
              <ChevronDown aria-hidden />
              Xem mục còn thiếu: {firstIncomplete.title}
            </Button>
          )}
        </div>
      ) : (
        <p className="flex items-start gap-2 rounded-lg border border-chart-4/40 bg-chart-4/10 p-3 text-sm text-foreground" role="status">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-chart-4" aria-hidden />
          {allPledged ? 'Hồ sơ đã đủ điều kiện gửi xét duyệt.' : 'Hồ sơ đã đủ thông tin. Tick đủ 3 cam đoan để gửi.'}
        </p>
      )}

      <Button type="button" className="h-11 w-full md:w-auto" disabled={!ready || busy} onClick={() => void submit()}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
        {resubmit ? 'Gửi lại hồ sơ' : 'Gửi xét duyệt'}
      </Button>
    </div>
  );
}
