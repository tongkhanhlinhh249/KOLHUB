import type { ReactNode } from 'react';
import { Check, Gift, MapPin, Package, Wallet, Workflow } from 'lucide-react';
import { cn } from '../../components/ui/utils';
import type { ApplicationDetails, CampaignReward, CampaignTarget, RecruitmentTimeline, RecruitPhase } from '../../services';
import { ToneBadge } from './StatusBadges';
import {
  milestoneRows,
  phaseBadge,
  RECRUIT_STAGE_LABEL,
  RECRUIT_STAGE_STEPS,
  regionText,
  rewardTotal,
  targetRows,
  vnd,
  workflowHint,
  workflowLabel,
  type RecruitStage,
} from './recruitView';

/** "D-5" / "Tuyển chọn" / "Đang đăng bài"… (see phaseBadge). */
export function PhaseBadge({ campaign, now, className }: { campaign: Parameters<typeof phaseBadge>[0]; now: number; className?: string }) {
  const b = phaseBadge(campaign, now);
  return (
    <ToneBadge tone={b.tone} className={cn('tabular-nums', className)}>
      <span aria-hidden>{b.text}</span>
      <span className="sr-only">{b.label}</span>
    </ToneBadge>
  );
}

/** Campaign type chip on every detail surface: "Booking riêng" (neutral) or "Tuyển nhiều KOL" (accent). */
export function CampaignTypeBadge({ type, className }: { type?: string; className?: string }) {
  if (type === 'OPEN_RECRUITMENT') return <RecruitTypeBadge className={className} />;
  return (
    <span className={cn('inline-flex h-6 items-center rounded-md border border-border bg-card px-2 text-xs font-medium whitespace-nowrap text-muted-foreground', className)}>
      Booking riêng
    </span>
  );
}

/** "Tuyển nhiều KOL" chip. */
export function RecruitTypeBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex h-6 items-center rounded-md border border-primary/30 bg-primary/5 px-2 text-xs font-medium whitespace-nowrap text-primary', className)}>
      Tuyển nhiều KOL
    </span>
  );
}

/**
 * The 4 milestones Ứng tuyển → Chọn lọc → Đăng bài → Đánh giá as a vertical stepper; the current one is highlighted
 * ("Đang diễn ra"), past ones are ticked.
 */
export function RecruitTimeline({ timeline, phase, className }: { timeline: RecruitmentTimeline; phase?: RecruitPhase; className?: string }) {
  const rows = milestoneRows(timeline, phase);
  return (
    <ol className={cn('space-y-0', className)} aria-label="Lịch trình chiến dịch">
      {rows.map((m, i) => (
        <li key={m.key} className="relative flex gap-3 pb-4 last:pb-0" aria-current={m.state === 'current' ? 'step' : undefined}>
          {i < rows.length - 1 && (
            <span className={cn('absolute top-7 bottom-1 left-[13px] w-0.5', m.state === 'done' ? 'bg-primary/60' : 'bg-border')} aria-hidden />
          )}
          <span
            className={cn(
              'z-[1] flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
              m.state === 'current' && 'border-primary bg-primary text-primary-foreground',
              m.state === 'done' && 'border-primary/60 bg-primary/10 text-primary',
              m.state === 'upcoming' && 'border-border bg-card text-muted-foreground',
            )}
            aria-hidden
          >
            {m.state === 'done' ? <Check className="size-3.5" /> : i + 1}
          </span>
          <div className={cn('min-w-0 flex-1 rounded-[8px] px-2 py-1', m.state === 'current' && 'bg-primary/10')}>
            <p className={cn('flex flex-wrap items-center gap-x-2 text-sm font-medium', m.state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground')}>
              {m.label}
              {m.state === 'current' && <span className="text-xs font-semibold text-primary">Đang diễn ra</span>}
              {m.state === 'done' && <span className="sr-only">(đã qua)</span>}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">{m.range}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium break-words text-foreground">{children}</div>
      </div>
    </div>
  );
}

/** "Phần thưởng" block: cash and / or product per KOL, total value, number of slots. */
export function RewardBlock({ reward, slots }: { reward: CampaignReward; slots?: number }) {
  return (
    <div className="space-y-3">
      {reward.cash > 0 && (
        <Row icon={<Wallet className="size-4" />} label="Tiền mặt mỗi KOL">
          <span className="text-base font-semibold text-primary tabular-nums">{vnd(reward.cash)}</span>
        </Row>
      )}
      {reward.product && (
        <Row icon={<Gift className="size-4" />} label="Sản phẩm tặng">
          {reward.product.name} <span className="font-normal text-muted-foreground tabular-nums">· trị giá {vnd(reward.product.value)}</span>
          {reward.product.note && <span className="block text-xs font-normal text-muted-foreground">{reward.product.note}</span>}
        </Row>
      )}
      <p className="text-xs text-muted-foreground">
        Tổng giá trị mỗi KOL: <span className="font-medium text-foreground tabular-nums">{vnd(rewardTotal(reward))}</span>
        {slots ? ` · Tuyển ${slots} KOL` : ''}. Phần thưởng cố định, không cần báo giá.
      </p>
    </div>
  );
}

/** "Điều kiện tham gia": age, gender, min followers, categories, region. */
export function ConditionsList({ target, categories, regions }: { target?: CampaignTarget; categories: string[]; regions: string[] }) {
  const rows = [...targetRows(target, categories), { label: 'Khu vực', value: regionText(regions, 6) }];
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 @md:grid-cols-2">
      {rows.map((r) => (
        <div key={r.label} className="flex min-w-0 items-baseline justify-between gap-3 border-b border-border/60 pb-2 @md:block @md:border-0 @md:pb-0">
          <dt className="text-xs text-muted-foreground">{r.label}</dt>
          <dd className="text-right text-sm font-medium text-foreground @md:text-left">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "Workflow: Duyệt nháp / Đăng trực tiếp" with its one-line explanation. */
export function WorkflowNote({ draftReview, className }: { draftReview: boolean; className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 rounded-[8px] bg-muted/60 p-3 text-sm text-foreground', className)}>
      <Workflow className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span>
        <span className="font-medium">Workflow: {workflowLabel(draftReview)}.</span> <span className="text-muted-foreground">{workflowHint(draftReview)}</span>
      </span>
    </p>
  );
}

export function RegionLine({ regions, className }: { regions: string[]; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1', className)} title={regions.join(', ') || 'Toàn quốc'}>
      <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="truncate">{regionText(regions)}</span>
    </span>
  );
}

/** Đã ứng tuyển → Đã được chọn → Đang thực hiện → Hoàn tất (or the closing state instead). */
export function RecruitStageStepper({ stage, className }: { stage: RecruitStage; className?: string }) {
  const closed = stage === 'NOT_SELECTED' || stage === 'WITHDRAWN' || stage === 'CANCELLED';
  const cur = closed ? -1 : RECRUIT_STAGE_STEPS.indexOf(stage);
  return (
    <div className={cn('space-y-2', className)}>
      <ol className="grid grid-cols-4 gap-1" aria-label="Tiến trình ứng tuyển">
        {RECRUIT_STAGE_STEPS.map((s, i) => {
          const done = !closed && i < cur;
          const current = !closed && i === cur;
          return (
            <li key={s} className="min-w-0 space-y-1" aria-current={current ? 'step' : undefined}>
              <span className={cn('block h-1.5 rounded-full', done || current ? 'bg-primary' : 'bg-muted')} aria-hidden />
              <span className={cn('block truncate text-[11px] leading-tight', current ? 'font-semibold text-primary' : done ? 'text-foreground' : 'text-muted-foreground')}>
                {RECRUIT_STAGE_LABEL[s]}
              </span>
            </li>
          );
        })}
      </ol>
      {closed && <p className="text-sm font-medium text-destructive">{RECRUIT_STAGE_LABEL[stage]}</p>}
    </div>
  );
}

/** Survey answers, accepted terms and the shipping address of an application (brand and applicant views). */
export function ApplicationDetailsBlock({ details, showTerms = true, className }: { details: ApplicationDetails; showTerms?: boolean; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {details.answers.length > 0 && (
        <dl className="space-y-2">
          {details.answers.map((a) => (
            <div key={a.questionId} className="rounded-[8px] bg-muted/60 p-2.5">
              <dt className="text-xs text-muted-foreground">{a.question}</dt>
              <dd className={cn('text-sm break-words whitespace-pre-line', a.answer ? 'text-foreground' : 'italic text-muted-foreground')}>
                {a.answer || 'Không trả lời'}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {details.shipping && (
        <div className="flex items-start gap-2 text-sm text-foreground">
          <Package className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="min-w-0 break-words">
            <span className="block text-xs text-muted-foreground">Địa chỉ nhận sản phẩm</span>
            {details.shipping.address}, {details.shipping.province}
            <span className="block text-muted-foreground tabular-nums">SĐT {details.shipping.phone}</span>
          </p>
        </div>
      )}
      {showTerms && details.acceptedTerms.length > 0 && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Check className="mt-0.5 size-3.5 shrink-0 text-chart-4" aria-hidden />
          <span>Đã đồng ý {details.acceptedTerms.length} điều khoản của chiến dịch.</span>
        </p>
      )}
    </div>
  );
}
