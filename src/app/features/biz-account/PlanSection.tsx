import { useState } from 'react';
import { Check, Phone } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button, buttonVariants } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import { planService, type PlanInfo } from '../../services';
import { SectionCard } from '../profile/ProfileSection';
import { useLiveQuery } from '../shared/useLiveQuery';

export const UPGRADE_PHONE = '0888138888';
const UPGRADE_PHONE_LABEL = '0888 138 888';

function PlanCard({ plan, current }: { plan: PlanInfo; current: boolean }) {
  return (
    <li className={cn('flex flex-col gap-4 rounded-[8px] border p-4', current ? 'border-primary bg-primary/5' : 'border-border bg-card')}>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
          {current && <Badge>Gói hiện tại</Badge>}
        </div>
        <p className="text-lg font-bold text-foreground">{plan.priceLabel}</p>
        <p className="text-sm text-muted-foreground">{plan.description}</p>
      </div>
      <ul className="flex-1 space-y-2" aria-label={`Tính năng gói ${plan.name}`}>
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2 text-sm text-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            {f}
          </li>
        ))}
      </ul>
      {current ? (
        <Button type="button" variant="outline" className="h-11 w-full md:h-9" disabled>
          Đang sử dụng
        </Button>
      ) : (
        <a href={`tel:${UPGRADE_PHONE}`} className={buttonVariants({ className: 'h-11 w-full md:h-9' })}>
          <Phone aria-hidden />
          Liên hệ nâng cấp
        </a>
      )}
    </li>
  );
}

/** "Gói dịch vụ" card on Tài khoản doanh nghiệp: current plan + "Xem các gói" dialog (catalog only in beta). */
export function PlanSection() {
  const [open, setOpen] = useState(false);
  const q = useLiveQuery(() => planService.getCurrentPlan(), []);
  const plans = planService.listPlans();
  const current = q.data?.plan;

  return (
    <>
      <SectionCard
        title="Gói dịch vụ"
        action={
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => setOpen(true)}>
            Xem các gói
          </Button>
        }
      >
        <div className="space-y-1 md:col-span-2">
          <dt className="text-xs text-muted-foreground">Gói hiện tại</dt>
          <dd className="space-y-0.5">
            {current ? (
              <>
                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                  {current.name}
                  <span className="font-normal text-muted-foreground">· {current.priceLabel}</span>
                </span>
                <span className="block text-xs text-muted-foreground">{current.description}</span>
              </>
            ) : q.error ? (
              <span className="text-sm text-muted-foreground">Không tải được gói hiện tại.</span>
            ) : (
              <Skeleton className="h-5 w-40" />
            )}
          </dd>
        </div>
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Các gói dịch vụ</DialogTitle>
            <DialogDescription>
              Giai đoạn beta chưa giới hạn tính năng theo gói. Liên hệ {UPGRADE_PHONE_LABEL} để được tư vấn nâng cấp.
            </DialogDescription>
          </DialogHeader>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {plans.map((p) => (
              <PlanCard key={p.key} plan={p} current={p.key === current?.key} />
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
