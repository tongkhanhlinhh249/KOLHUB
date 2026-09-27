import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { cn } from '../../components/ui/utils';
import type { ViolationAction, ViolationActor } from '../../services';
import { PlatformIcon, platformLabel } from '../biz-search/PlatformIcon';
import { ACTION_LABEL, formatDayTime, SeverityBadge, SourceLabel, ViolationStatusBadge } from './ViolationParts';
import type { ViolationRowBase } from './violationQuery';

export interface DetailViolation extends ViolationRowBase {
  history: { at: number; action: ViolationAction; actor?: ViolationActor; note?: string }[];
  reporterNote?: string;
  ownerNote?: string;
  appealReason?: string;
  adminReason?: string;
}

const ACTOR_LABEL: Record<ViolationActor, string> = { system: 'Hệ thống', admin: 'Admin', owner: 'Chủ kênh' };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </div>
  );
}

function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3 text-sm">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 whitespace-pre-line text-foreground">{children}</p>
    </div>
  );
}

const href = (url: string) => (/^https?:\/\//.test(url) ? url : `https://${url}`);

/**
 * Full detail + history timeline. `mode="brand"` never shows reporter / owner / appeal / Admin notes
 * (the Brand projection does not carry them anyway).
 */
export function ViolationDetailSheet({
  violation: v,
  mode,
  onOpenChange,
  onKol,
  footer,
}: {
  violation: DetailViolation | null;
  mode: 'owner' | 'brand';
  onOpenChange(open: boolean): void;
  onKol?(kolId: string): void;
  footer?: ReactNode;
}) {
  const owner = mode === 'owner';
  return (
    <Sheet open={!!v} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {v && (
          <>
            <SheetHeader className="border-b border-border p-4 pr-12 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <ViolationStatusBadge status={v.status} />
                <SeverityBadge severity={v.severity} />
              </div>
              <SheetTitle className="text-base leading-snug">{v.contentTitle}</SheetTitle>
              <SheetDescription>{v.category}</SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 p-4">
              {v.thumbnail && (
                <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                  <img src={v.thumbnail} alt="" className="size-full object-cover" />
                  <PlatformIcon platform={v.platform} className="absolute top-2 left-2 size-6" />
                </div>
              )}

              <dl className="divide-y divide-border">
                {v.kolName && (
                  <Row label="KOL">
                    {onKol && v.kolId ? (
                      <button
                        type="button"
                        onClick={() => onKol(v.kolId!)}
                        className="rounded-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {v.kolName}
                      </button>
                    ) : (
                      v.kolName
                    )}
                    {v.kolId && <span className="text-muted-foreground"> · {v.kolId}</span>}
                  </Row>
                )}
                <Row label="Kênh">
                  <a
                    href={href(v.channelUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 text-primary hover:underline"
                  >
                    <PlatformIcon platform={v.platform} />
                    <span className="truncate">@{v.channelHandle}</span>
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                  </a>
                  <span className="sr-only"> ({platformLabel(v.platform)})</span>
                </Row>
                {v.contentUrl && (
                  <Row label="Nội dung">
                    <a href={href(v.contentUrl)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      Mở nội dung
                      <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  </Row>
                )}
                <Row label="Nguồn">
                  <SourceLabel source={v.source} />
                </Row>
                <Row label="Ngày phát hiện">{formatDayTime(v.detectedAt)}</Row>
              </dl>

              {owner && (
                <div className="space-y-2">
                  {v.reporterNote && <Note title="Nội dung báo cáo">{v.reporterNote}</Note>}
                  {v.appealReason && <Note title="Lý do khiếu nại của bạn">{v.appealReason}</Note>}
                  {v.adminReason && <Note title="Phản hồi của Admin">{v.adminReason}</Note>}
                  {v.ownerNote && <Note title="Ghi chú khắc phục">{v.ownerNote}</Note>}
                </div>
              )}

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Lịch sử xử lý</h3>
                <ol className="space-y-0">
                  {[...v.history].reverse().map((e, i, arr) => (
                    <li key={`${e.at}-${e.action}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < arr.length - 1 && <span className="absolute top-3 bottom-0 left-[5px] w-px bg-border" aria-hidden />}
                      <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', i === 0 ? 'bg-primary' : 'bg-muted-foreground/50')} aria-hidden />
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-medium text-foreground">{ACTION_LABEL[e.action]}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDayTime(e.at)}
                          {owner && e.actor ? ` · ${ACTOR_LABEL[e.actor]}` : ''}
                        </p>
                        {owner && e.note && <p className="text-sm whitespace-pre-line text-foreground/80">{e.note}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            {footer && <SheetFooter className="flex-row flex-wrap justify-end gap-2 border-t border-border p-4 pb-safe">{footer}</SheetFooter>}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
