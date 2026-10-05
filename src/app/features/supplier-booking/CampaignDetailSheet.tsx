import { useState } from 'react';
import { Link } from 'react-router';
import { AlertCircle, Building2, Loader2, LogIn, Pencil, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Skeleton } from '../../components/ui/skeleton';
import { cn } from '../../components/ui/utils';
import {
  BOOKING_NOTE_MAX,
  BOOKING_STATUS_LABEL,
  bookingService,
  campaignService,
  type BookingView,
  type OwnerType,
  type ProfileStatus,
} from '../../services';
import { CampaignCover } from '../shared/CampaignCover';
import { useLiveQuery } from '../shared/useLiveQuery';
import { ReasonDialog } from '../violations/ReasonDialog';
import { ApplyDialog } from './ApplyDialog';
import { MineBadge, MyBookingBadge } from './MarketplaceCampaignCard';
import { BrandInfoBlock, MatchDetails, SaveButton } from './MarketplaceParts';
import { CategoryChips, CountdownText, errText, Fact, LongText, PlatformIcons, SheetSection } from './parts';
import {
  bookingDetailPath,
  brandCampaignPath,
  deadlineCountdown,
  deliverableLabel,
  formatDay,
  formatDayRange,
  formatVnd,
  loginToApplyPath,
  platformName,
  type MarketplaceViewer,
} from './supplierBooking';
import { SupplierGate } from './useSupplierAccess';
import { PlatformIcon } from '../biz-search/PlatformIcon';

/**
 * The sheet's built-in close button (last child of the content) as a round, near-opaque 44 px button (36 px from md)
 * so it stays visible over the cover image.
 */
const CLOSE_OVER_IMAGE = [
  '[&>button:last-child]:top-2 [&>button:last-child]:right-2 [&>button:last-child]:z-20',
  '[&>button:last-child]:flex [&>button:last-child]:size-11 md:[&>button:last-child]:size-9',
  '[&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:rounded-full',
  '[&>button:last-child]:bg-background/90 [&>button:last-child]:opacity-100 [&>button:last-child]:shadow-sm',
].join(' ');

/**
 * Marketplace campaign detail (?chien-dich=): brief, deliverables, content rules, dates and the
 * "Ứng tuyển" action — or the viewer's booking on it, or the profile gate when not approved.
 * Guest: "Đăng nhập để ứng tuyển". Brand: read-only; own campaigns link to their campaign page.
 */
export function CampaignDetailSheet({
  campaignId,
  onClose,
  access,
  viewer = 'supplier',
}: {
  campaignId: string | null;
  onClose(): void;
  access: { accountId: string; ownerType: OwnerType; status?: ProfileStatus; approved: boolean };
  viewer?: MarketplaceViewer;
}) {
  const supplier = viewer === 'supplier';
  const q = useLiveQuery(() => (campaignId ? campaignService.getMarketplaceItem(campaignId) : Promise.resolve(null)), [campaignId]);
  const c = q.data && q.data.id === campaignId ? q.data : null;
  const [applyOpen, setApplyOpen] = useState(false);
  const [applied, setApplied] = useState<BookingView | null>(null);
  const [editing, setEditing] = useState<BookingView | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const now = Date.now();
  const countdown = c ? deadlineCountdown(c.applyDeadline, now) : null;
  const closed = !!countdown?.passed;
  const myBookingId = c?.myBooking?.id ?? (applied && applied.campaignId === c?.id ? applied.id : undefined);
  // Sàn v2: an application the brand has not answered yet can be edited or withdrawn here.
  const editable = supplier && access.approved && c?.myBooking?.origin === 'APPLICATION' && c.myBooking.status === 'APPLIED';

  const startEdit = async () => {
    if (!c?.myBooking) return;
    setLoadingEdit(true);
    try {
      const b = await bookingService.get(c.myBooking.id);
      if (!b.allowedActions.includes('EDIT_APPLICATION')) {
        toast.error('Nhãn hàng đã phản hồi, không thể sửa đề xuất nữa.');
        return;
      }
      setEditing(b);
      setApplyOpen(true);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setLoadingEdit(false);
    }
  };

  return (
    <Sheet open={campaignId !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className={cn('flex w-full flex-col gap-0 p-0 sm:max-w-xl lg:max-w-2xl', CLOSE_OVER_IMAGE)}>
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
              {c.cover && <CampaignCover cover={c.cover} alt={`Ảnh chiến dịch ${c.name}`} className="aspect-video w-full" />}
              <div className={cn('space-y-2 border-b border-border bg-muted/50 px-4 pb-5 sm:px-6', c.cover ? 'pt-4 sm:pt-5' : 'pt-12 sm:pt-6')}>
                <p className="flex items-center gap-1.5 pr-8 text-sm text-muted-foreground">
                  <Building2 className="size-4 shrink-0" aria-hidden />
                  <span className="truncate font-medium text-foreground">{c.brand.company}</span>
                </p>
                <h2 className="pr-8 text-lg font-semibold break-words text-foreground sm:text-xl">{c.name}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {c.myBooking && <MyBookingBadge myBooking={c.myBooking} />}
                  {c.mine && <MineBadge />}
                  <PlatformIcons platforms={c.platforms} withLabel />
                </div>
              </div>

              <div className="space-y-6 p-4 sm:p-6">
                {c.match && (
                  <SheetSection title="Phù hợp với bạn">
                    <MatchDetails match={c.match} />
                  </SheetSection>
                )}

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

                {c.brandInfo && (
                  <SheetSection title="Nhãn hàng">
                    <BrandInfoBlock info={c.brandInfo} />
                  </SheetSection>
                )}
              </div>
            </div>

            <div className="@container shrink-0 space-y-3 border-t border-border bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
              {viewer === 'guest' ? (
                <GuestFooter campaignId={c.id} closed={closed} />
              ) : viewer === 'brand' ? (
                <BrandFooter campaignId={c.id} mine={!!c.mine} />
              ) : myBookingId ? (
                <div className="flex flex-col gap-3 @lg:flex-row @lg:items-center @lg:justify-between">
                  <p className="text-sm text-foreground">
                    {c.myBooking
                      ? `${c.myBooking.origin === 'APPLICATION' ? 'Bạn đã ứng tuyển' : 'Bạn đã được mời'} · ${c.myBooking.status === 'SENT' ? 'Lời mời mới' : BOOKING_STATUS_LABEL[c.myBooking.status]}`
                      : 'Bạn đã ứng tuyển · Chờ Nhãn hàng phản hồi'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 @lg:flex @lg:items-center">
                    {editable && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-11 text-destructive hover:text-destructive md:h-9"
                          onClick={() => setWithdrawOpen(true)}
                        >
                          Rút đề xuất
                        </Button>
                        <Button type="button" variant="outline" className="h-11 md:h-9" disabled={loadingEdit} onClick={() => void startEdit()}>
                          {loadingEdit ? <Loader2 className="animate-spin" aria-hidden /> : <Pencil aria-hidden />}
                          Sửa đề xuất
                        </Button>
                      </>
                    )}
                    <Link to={bookingDetailPath(myBookingId)} className={buttonVariants({ className: cn('h-11 md:h-9', editable && 'col-span-2') })}>
                      Xem booking
                    </Link>
                  </div>
                </div>
              ) : !access.approved ? (
                <div className="space-y-3">
                  <SupplierGate ownerType={access.ownerType} status={access.status} compact />
                  {c.accepting !== false && <SaveButton campaignId={c.id} saved={!!c.saved} name={c.name} className="w-full @lg:w-auto" />}
                </div>
              ) : (
                <div className="flex flex-col gap-2 @lg:flex-row @lg:items-center @lg:justify-end">
                  {closed && <p className="text-sm text-muted-foreground @lg:mr-auto">Chiến dịch đã hết hạn nhận đề xuất.</p>}
                  <div className="grid grid-cols-2 gap-2 @lg:flex">
                    <SaveButton campaignId={c.id} saved={!!c.saved} name={c.name} />
                    <Button type="button" className="h-11 md:h-9" disabled={closed} onClick={() => setApplyOpen(true)}>
                      Ứng tuyển
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {supplier && access.approved && (
              <ApplyDialog
                open={applyOpen}
                onOpenChange={(o) => {
                  setApplyOpen(o);
                  if (!o) setEditing(null);
                }}
                campaign={c}
                accountId={access.accountId}
                supplierType={access.ownerType}
                onApplied={setApplied}
                editing={editing}
              />
            )}

            {editable && c.myBooking && (
              <ReasonDialog
                open={withdrawOpen}
                onOpenChange={setWithdrawOpen}
                title="Rút đề xuất ứng tuyển"
                description="Nhãn hàng sẽ không thể chấp nhận đề xuất này nữa. Bạn có thể ứng tuyển lại khi chiến dịch còn nhận đề xuất."
                label="Lý do (không bắt buộc)"
                placeholder="Nêu ngắn gọn lý do…"
                confirmLabel="Rút đề xuất"
                minLength={0}
                maxLength={BOOKING_NOTE_MAX}
                destructive
                onConfirm={async (text) => {
                  await bookingService.cancel(c.myBooking!.id, text || undefined);
                  setApplied(null);
                  toast.success('Đã rút đề xuất', { description: c.name });
                }}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Guest: public brief only; applying needs an account (returns to this campaign after login). */
function GuestFooter({ campaignId, closed }: { campaignId: string; closed: boolean }) {
  return (
    <div className="flex flex-col gap-2 @lg:flex-row @lg:items-center @lg:justify-between">
      <p className="text-sm text-muted-foreground">
        {closed ? 'Chiến dịch đã hết hạn nhận đề xuất.' : 'Đăng nhập bằng tài khoản KOL hoặc MCN để ứng tuyển.'}{' '}
        <Link to="/dang-ky" className="font-medium text-primary underline-offset-4 hover:underline">
          Chưa có tài khoản? Đăng ký
        </Link>
      </p>
      {!closed && (
        <Link to={loginToApplyPath(campaignId)} className={buttonVariants({ className: 'h-11 w-full @lg:w-auto md:h-9' })}>
          <LogIn aria-hidden />
          Đăng nhập để ứng tuyển
        </Link>
      )}
    </div>
  );
}

/** Brand: the Sàn is read-only; own campaigns link to their management page. */
function BrandFooter({ campaignId, mine }: { campaignId: string; mine: boolean }) {
  if (!mine) {
    return <p className="text-sm text-muted-foreground">Bạn đang xem Sàn với vai trò Nhãn hàng. Chỉ KOL/MCN mới gửi được đề xuất ứng tuyển.</p>;
  }
  return (
    <div className="flex flex-col gap-2 @lg:flex-row @lg:items-center @lg:justify-between">
      <p className="text-sm text-foreground">Đây là chiến dịch của bạn. Xem đề xuất ứng tuyển và quản lý booking trong trang chiến dịch.</p>
      <Link to={brandCampaignPath(campaignId)} className={buttonVariants({ className: 'h-11 w-full @lg:w-auto md:h-9' })}>
        Quản lý chiến dịch
      </Link>
    </div>
  );
}
