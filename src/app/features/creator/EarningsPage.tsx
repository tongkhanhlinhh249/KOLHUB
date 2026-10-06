import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { AlertCircle, Building2, Gift, Info, RotateCcw, Wallet } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { bookingService } from '../../services';
import { MARKETPLACE_PATH } from '../../auth/roles';
import { CampaignCover } from '../shared/CampaignCover';
import { ToneBadge, type Tone } from '../shared/StatusBadges';
import { useLiveQuery } from '../shared/useLiveQuery';
import { SupplierGate, useSupplierAccess } from '../supplier-booking/useSupplierAccess';
import { bookingDetailPath, formatVnd } from '../supplier-booking/supplierBooking';
import { StatTile } from './PortfolioPage';
import {
  CASH_STATUS_LABEL,
  earningRows,
  earningsByKol,
  earningsByMonth,
  earningTotals,
  monthLabel,
  PRODUCT_STATUS_LABEL,
  type CashStatus,
  type ProductStatus,
} from './earnings';

const CASH_TONE: Record<CashStatus, Tone> = { PENDING: 'warning', MARKED: 'info', RECEIVED: 'success' };
const PRODUCT_TONE: Record<ProductStatus, Tone> = { PENDING: 'neutral', SENT: 'info', RECEIVED: 'success' };

function Block({ id, title, children, hint }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-2">
      <div>
        <h2 id={id} className="text-base font-semibold text-foreground">
          {title}
        </h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const num = 'text-right tabular-nums whitespace-nowrap';

/**
 * /thu-nhap — "Thu nhập" of the signed-in KOL / MCN: a record-only ledger (not a wallet) of cash and product rewards per
 * campaign with their status, summary cards, monthly totals and (MCN) totals per KOL. Payment happens outside KOL Hub.
 */
export function EarningsPage() {
  const access = useSupplierAccess();
  const q = useLiveQuery(() => (access.approved ? bookingService.listForSupplier() : Promise.resolve(null)), [access.approved, access.accountId]);
  const rows = useMemo(() => earningRows(q.data ?? []), [q.data]);
  const totals = earningTotals(rows);
  const months = useMemo(() => earningsByMonth(rows), [rows]);
  const byKol = useMemo(() => (access.ownerType === 'MCN' ? earningsByKol(rows) : []), [rows, access.ownerType]);

  const note = (
    <Alert>
      <Info className="size-4" aria-hidden />
      <AlertTitle>Chỉ ghi nhận, không phải ví</AlertTitle>
      <AlertDescription>
        Tiền và sản phẩm được Nhãn hàng thanh toán, gửi trực tiếp cho bạn ngoài KOL Hub. Trang này chỉ tổng hợp các mốc đã ghi nhận: Nhãn hàng
        đánh dấu đã trả, bạn xác nhận đã nhận.
      </AlertDescription>
    </Alert>
  );

  if (access.loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-3 p-4 md:p-6" aria-busy="true">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const empty = (title: string, text: string) => (
    <div className="flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-border px-4 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Wallet className="size-6" aria-hidden />
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{text}</p>
      <Link to={MARKETPLACE_PATH} className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}>
        Xem Sàn chiến dịch
      </Link>
    </div>
  );

  if (!access.approved) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
        <SupplierGate ownerType={access.ownerType} status={access.status} />
        {empty('Thu nhập sẽ xuất hiện ở đây', 'Sau khi hồ sơ được duyệt và bạn chốt booking với Nhãn hàng, các khoản tiền và sản phẩm được ghi nhận tại trang này.')}
      </div>
    );
  }

  if (q.loading && !q.data) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-3 p-4 md:p-6" aria-busy="true" aria-label="Đang tải thu nhập">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (q.error && !q.data) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>Không tải được thu nhập.</span>
            <Button type="button" variant="outline" size="sm" className="h-11 md:h-8" onClick={q.reload}>
              <RotateCcw aria-hidden />
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="@container mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <dl className="grid grid-cols-1 gap-2 @lg:grid-cols-3 md:gap-3">
        <StatTile label="Đã nhận" value={formatVnd(totals.received)} hint="Tiền bạn đã xác nhận nhận được" />
        <StatTile
          label="Đang chờ"
          value={formatVnd(totals.pending)}
          hint={totals.marked > 0 ? `${formatVnd(totals.marked)} Nhãn hàng đã đánh dấu đã trả` : 'Chưa thanh toán hoặc chưa xác nhận'}
        />
        <StatTile
          label="Giá trị sản phẩm"
          value={formatVnd(totals.productValue)}
          hint={totals.productValue > 0 ? `${formatVnd(totals.productReceived)} đã nhận` : 'Chưa có phần thưởng sản phẩm'}
        />
      </dl>

      {note}

      {rows.length === 0 ? (
        empty('Chưa có khoản thu nhập nào', 'Khi booking được chốt, khoản tiền và sản phẩm của chiến dịch sẽ được ghi nhận tại đây.')
      ) : (
        <>
          <Block id="tn-thang" title="Theo tháng" hint="Tính theo ngày bạn xác nhận đã nhận, ngày Nhãn hàng đánh dấu đã trả, hoặc ngày chốt booking.">
            <div className="overflow-x-auto rounded-[8px] border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tháng</TableHead>
                    <TableHead className="text-right">Đã nhận</TableHead>
                    <TableHead className="text-right">Đang chờ</TableHead>
                    <TableHead className="text-right">Sản phẩm</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {months.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium whitespace-nowrap">{monthLabel(m.month)}</TableCell>
                      <TableCell className={num}>{formatVnd(m.received)}</TableCell>
                      <TableCell className={num}>{formatVnd(m.pending)}</TableCell>
                      <TableCell className={num}>{formatVnd(m.productValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Block>

          {byKol.length > 0 && (
            <Block id="tn-kol" title="Theo KOL" hint="Booking nhiều KOL được chia theo số lượng hạng mục của từng KOL.">
              <div className="overflow-x-auto rounded-[8px] border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>KOL</TableHead>
                      <TableHead className="text-right">Booking</TableHead>
                      <TableHead className="text-right">Đã nhận</TableHead>
                      <TableHead className="text-right">Đang chờ</TableHead>
                      <TableHead className="text-right">Sản phẩm</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byKol.map((k) => (
                      <TableRow key={k.kolAccountId}>
                        <TableCell className="font-medium whitespace-nowrap">{k.kolName}</TableCell>
                        <TableCell className={num}>{k.rows}</TableCell>
                        <TableCell className={num}>{formatVnd(k.received)}</TableCell>
                        <TableCell className={num}>{formatVnd(k.pending)}</TableCell>
                        <TableCell className={num}>{formatVnd(k.productValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Block>
          )}

          <Block id="tn-chien-dich" title="Theo chiến dịch">
            <ul className="divide-y divide-border rounded-[8px] border border-border">
              {rows.map((r) => (
                <li key={r.bookingId} className="flex flex-col gap-2 p-3 @xl:flex-row @xl:items-center @xl:gap-4 md:p-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3 @xl:min-w-64">
                  <CampaignCover cover={r.campaignCover} className="aspect-video w-16 shrink-0 rounded-[6px]" iconClassName="size-4" />
                  <div className="min-w-0 flex-1">
                    <Link to={bookingDetailPath(r.bookingId)} className="text-sm font-semibold break-words text-foreground underline-offset-4 hover:text-primary hover:underline">
                      {r.campaignName}
                    </Link>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{r.brandCompany}</span>
                      <span>· {monthLabel(r.month)}</span>
                    </p>
                  </div>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 @xl:max-w-[60%] @xl:justify-end">
                    {(r.cash > 0 || !r.product) && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground tabular-nums">{formatVnd(r.cash)}</span>
                        <ToneBadge tone={CASH_TONE[r.cashStatus]}>{CASH_STATUS_LABEL[r.cashStatus]}</ToneBadge>
                      </div>
                    )}
                    {r.product && (
                      <div className="flex min-w-0 items-center gap-2">
                        <Gift className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0 truncate text-sm text-foreground" title={r.product.name}>
                          {r.product.name} · <span className="tabular-nums">{formatVnd(r.product.value)}</span>
                        </span>
                        <ToneBadge tone={PRODUCT_TONE[r.product.status]}>{PRODUCT_STATUS_LABEL[r.product.status]}</ToneBadge>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Block>
        </>
      )}
    </div>
  );
}
