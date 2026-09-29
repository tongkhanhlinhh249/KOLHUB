import { useState } from 'react';
import { Link } from 'react-router';
import { AlertCircle, Building2, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Skeleton } from '../../components/ui/skeleton';
import { BOOKING_STATUS_LABEL, campaignService, type BookingView, type OwnerType, type ProfileStatus } from '../../services';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ApplyDialog } from './ApplyDialog';
import { MyBookingBadge } from './MarketplaceCampaignCard';
import { CategoryChips, CountdownText, errText, Fact, LongText, PlatformIcons, SheetSection } from './parts';
import {
  bookingDetailPath,
  deadlineCountdown,
  deliverableLabel,
  formatDay,
  formatDayRange,
  formatVnd,
  platformName,
} from './supplierBooking';
import { SupplierGate } from './useSupplierAccess';
import { PlatformIcon } from '../biz-search/PlatformIcon';

/**
 * Marketplace campaign detail (?chien-dich=): brief, deliverables, content rules, dates and the
 * "Ứng tuyển" action — or the viewer's booking on it, or the profile gate when not approved.
 */
export function CampaignDetailSheet({
  campaignId,
  onClose,
  access,
}: {
  campaignId: string | null;
  onClose(): void;
  access: { accountId: string; ownerType: OwnerType; status?: ProfileStatus; approved: boolean };
}) {
  const q = useLiveQuery(() => (campaignId ? campaignService.getMarketplaceItem(campaignId) : Promise.resolve(null)), [campaignId]);
  const c = q.data && q.data.id === campaignId ? q.data : null;
  const [applyOpen, setApplyOpen] = useState(false);
  const [applied, setApplied] = useState<BookingView | null>(null);
  const now = Date.now();
  const countdown = c ? deadlineCountdown(c.applyDeadline, now) : null;
  const closed = !!countdown?.passed;
  const myBookingId = c?.myBooking?.id ?? (applied && applied.campaignId === c?.id ? applied.id : undefined);

  return (
    <Sheet open={campaignId !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl lg:max-w-2xl">
        <SheetHeader className="sr-only">
          <SheetTitle>{c ? c.name : 'Chi tiết chiến dịch'}</SheetTitle>
          <SheetDescription>Brief, hạng mục, quy định nội dung và thời gian của chiến dịch.</SheetDescription>
        </SheetHeader>

        {q.loading && !c && (
          <div className="space-y-4 p-4 pt-12 sm:p-6" aria-busy="true" aria-label="Đang tải chiến dịch">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {q.error && !c && !q.loading ? (
          <div className="p-4 pt-12 sm:p-6">
            <Alert variant="destructive">
              <AlertCircle className="size-4" aria-hidden />
              <AlertDescription className="space-y-3">
                <p>{errText(q.error)}</p>
                <Button type="button" variant="outline" className="h-11 md:h-8" onClick={q.reload}>
                  <RotateCcw aria-hidden />
                  Thử lại
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        {c && (
          <>
            <div className="@container min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-2 border-b border-border bg-muted/50 px-4 pt-12 pb-5 sm:px-6 sm:pt-6">
                <p className="flex items-center gap-1.5 pr-8 text-sm text-muted-foreground">
                  <Building2 className="size-4 shrink-0" aria-hidden />
                  <span className="truncate font-medium text-foreground">{c.brand.company}</span>
                </p>
                <h2 className="pr-8 text-lg font-semibold break-words text-foreground sm:text-xl">{c.name}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {c.myBooking && <MyBookingBadge myBooking={c.myBooking} />}
                  <PlatformIcons platforms={c.platforms} withLabel />
                </div>
              </div>

              <div className="space-y-6 p-4 sm:p-6">
                <dl className="grid grid-cols-2 gap-4 rounded-[8px] border border-border p-4 @lg:grid-cols-4">
                  <Fact label="Ngân sách">
                    <span className="font-semibold text-primary tabular-nums">{formatVnd(c.budget)}</span>
                  </Fact>
                  <Fact label="Thời gian">{formatDayRange(c.startDate, c.endDate)}</Fact>
                  <Fact label="Hạn ứng tuyển">
                    {c.applyDeadline ? (
                      <span className="flex flex-col gap-0.5">
                        {formatDay(c.applyDeadline)}
                        <CountdownText countdown={countdown} />
                      </span>
                    ) : (
                      'Không giới hạn'
                    )}
                  </Fact>
                  <Fact label="Đề xuất đã nhận">{c.applicationCount}</Fact>
                </dl>

                <SheetSection title="Lĩnh vực">
                  {c.categories.length ? <CategoryChips categories={c.categories} /> : <p className="text-sm text-muted-foreground">Không giới hạn</p>}
                </SheetSection>

                <SheetSection title="Mục tiêu">
                  <LongText text={c.objective} />
                </SheetSection>

                <SheetSection title="Brief">
                  <LongText text={c.brief} />
                </SheetSection>

                <SheetSection title="Hạng mục yêu cầu">
                  <ul className="divide-y divide-border rounded-[8px] border border-border">
                    {c.deliverables.map((d, i) => (
                      <li key={i} className="flex min-h-12 items-center gap-3 px-3 py-2 text-sm">
                        <PlatformIcon platform={d.platform} className="size-6 rounded-md" />
                        <span className="min-w-0 flex-1 text-foreground">
                          {deliverableLabel(d.type)} {platformName(d.platform)}
                        </span>
                        <span className="font-medium text-foreground tabular-nums">× {d.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </SheetSection>

                <SheetSection title="Quy định nội dung">
                  <LongText text={c.contentRules} />
                </SheetSection>
              </div>
            </div>

            <div className="shrink-0 space-y-3 border-t border-border bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
              {myBookingId ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-foreground">
                    {c.myBooking
                      ? `${c.myBooking.origin === 'APPLICATION' ? 'Bạn đã ứng tuyển' : 'Bạn đã được mời'} · ${c.myBooking.status === 'SENT' ? 'Lời mời mới' : BOOKING_STATUS_LABEL[c.myBooking.status]}`
                      : 'Bạn đã ứng tuyển · Chờ Nhãn hàng phản hồi'}
                  </p>
                  <Link to={bookingDetailPath(myBookingId)} className={buttonVariants({ className: 'h-11 md:h-9' })}>
                    Xem booking
                  </Link>
                </div>
              ) : !access.approved ? (
                <SupplierGate ownerType={access.ownerType} status={access.status} compact />
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  {closed && <p className="text-sm text-muted-foreground sm:mr-auto">Chiến dịch đã hết hạn nhận đề xuất.</p>}
                  <Button type="button" className="h-11 md:h-9" disabled={closed} onClick={() => setApplyOpen(true)}>
                    Ứng tuyển
                  </Button>
                </div>
              )}
            </div>

            {access.approved && (
              <ApplyDialog
                open={applyOpen}
                onOpenChange={setApplyOpen}
                campaign={c}
                accountId={access.accountId}
                supplierType={access.ownerType}
                onApplied={setApplied}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
