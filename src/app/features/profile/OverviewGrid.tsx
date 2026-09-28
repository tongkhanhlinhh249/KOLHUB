import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { AlertCircle, CheckCircle2, ChevronRight, IdCard, Info, MonitorPlay, Plus, UserPlus, Users } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import { canManageKolAssignments, type Channel, type McnKolRow, type OwnerType, type ProfileStatus } from '../../services';
import { PlatformIcon } from '../biz-search/PlatformIcon';
import { KolAvatar } from '../mcn-kols/McnKolRow';
import { ToneBadge, type Tone } from '../shared/StatusBadges';
import { channelStats, kolStats, type OverviewItem, type OverviewSection, type OverviewSectionKey } from './overviewSections';
import { mcnKolsPath, profilePath } from './primaryAction';

const ICON: Record<OverviewSectionKey, typeof IdCard> = { 'thong-tin': IdCard, kenh: MonitorPlay, kol: Users };

/**
 * "Còn thiếu N" counts required items only; "Đã đủ" once they are met (with a subtle "N gợi ý" while
 * recommendations remain). A card holding only recommendations shows "Khuyến nghị" until they are done.
 */
export function SectionStateBadge({ section }: { section: OverviewSection }) {
  if (!section.complete) return <ToneBadge tone="warning">Còn thiếu {section.missing}</ToneBadge>;
  const onlyRecommended = section.items.every((i) => !i.required);
  if (onlyRecommended && section.suggestions > 0) return <ToneBadge tone="info">Khuyến nghị</ToneBadge>;
  return (
    <span className="inline-flex items-center gap-2">
      <ToneBadge tone="success">Đã đủ</ToneBadge>
      {section.suggestions > 0 && <span className="text-xs whitespace-nowrap text-muted-foreground">{section.suggestions} gợi ý</span>}
    </span>
  );
}

/**
 * One row: ✓ met, ! required and missing, (i) recommended and missing ("Khuyến nghị", never blocks submit);
 * the whole row links to where it is viewed or fixed.
 */
function ItemRow({ item }: { item: OverviewItem }) {
  const recommended = !item.required && !item.ok;
  return (
    <li>
      <Link
        to={item.to}
        className="-mx-2 flex min-h-11 items-start gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:min-h-0"
      >
        {item.ok ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-chart-4" aria-label="Đạt" />
        ) : recommended ? (
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="Khuyến nghị" />
        ) : (
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-chart-5" aria-label="Còn thiếu" />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm font-medium text-foreground">
            {item.label}
            {!item.required && (
              <span className="rounded bg-muted px-1.5 py-px text-[11px] font-normal text-muted-foreground">Khuyến nghị</span>
            )}
          </span>
          {item.detail && (
            <span className={cn('block text-xs break-words', item.ok || recommended ? 'text-muted-foreground' : 'text-foreground/80')}>
              {item.detail}
            </span>
          )}
        </span>
        <span className="mt-0.5 inline-flex shrink-0 items-center text-xs font-medium text-primary">
          {item.ok ? 'Xem' : 'Bổ sung'}
          <ChevronRight className="size-4" aria-hidden />
        </span>
      </Link>
    </li>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: Tone }) {
  return (
    <li
      className={cn(
        'flex items-center justify-between gap-2 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs',
        value === 0 && 'text-muted-foreground',
        value > 0 && tone === 'warning' && 'bg-chart-5/15',
        value > 0 && tone === 'error' && 'bg-destructive/10',
      )}
    >
      <span className="truncate">{label}</span>
      <span className={cn('font-semibold tabular-nums', value > 0 && 'text-foreground')}>{value}</span>
    </li>
  );
}

function SectionCard({ section, summary, actions }: { section: OverviewSection; summary?: ReactNode; actions: ReactNode }) {
  const Icon = ICON[section.key];
  const titleId = `${section.anchorId}-title`;
  return (
    <Card
      id={section.anchorId}
      tabIndex={-1}
      aria-labelledby={titleId}
      className={cn(
        'scroll-mt-20 gap-3 p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring md:p-5',
        !section.complete && 'border-chart-5/50',
      )}
    >
      {/* Title never truncates: the state badge wraps under it when the card is narrow. */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <h3 id={titleId} className="flex min-w-0 items-center gap-2 font-semibold text-foreground">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="whitespace-nowrap">{section.title}</span>
        </h3>
        <SectionStateBadge section={section} />
      </div>
      {summary}
      <ul
        className="space-y-0.5 @xl/card:grid @xl/card:grid-cols-2 @xl/card:gap-x-6 @xl/card:space-y-0"
        aria-label={`Điều kiện: ${section.title}`}
      >
        {section.items.map((i) => (
          <ItemRow key={i.key} item={i} />
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-2 pt-1 @xs/card:flex-row @xs/card:flex-wrap">{actions}</div>
    </Card>
  );
}

const btn = 'h-11 w-full md:h-9 @xs/card:w-auto';

function SectionLink({ section }: { section: OverviewSection }) {
  return (
    <Button asChild variant="outline" className={btn}>
      <Link to={section.to}>
        {section.linkLabel}
        <ChevronRight aria-hidden />
      </Link>
    </Button>
  );
}

function ChannelSummary({ channels, now }: { channels: Channel[]; now: number }) {
  const st = channelStats(channels, now);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-sm">
          <span className="text-2xl font-semibold text-foreground tabular-nums">{st.total}</span>{' '}
          <span className="text-muted-foreground">kênh</span>
        </p>
        {st.platforms.length > 0 && (
          <span className="flex items-center gap-1.5" aria-label="Nền tảng">
            {st.platforms.map((p) => (
              <PlatformIcon key={p} platform={p} />
            ))}
          </span>
        )}
      </div>
      {st.total > 0 && (
        <ul className="grid grid-cols-2 gap-1.5" aria-label="Kênh theo trạng thái">
          <Stat label="Đã xác thực" value={st.byStatus.verified} />
          <Stat label="Chờ duyệt" value={st.byStatus.pending} />
          <Stat label="Cần bổ sung" value={st.byStatus.needs_fix} tone="warning" />
          <Stat label="Hết hạn" value={st.byStatus.expired} tone="error" />
          <Stat label="Đang tắt" value={st.off} />
        </ul>
      )}
    </div>
  );
}

function KolSummary({ channels, kols }: { channels: Channel[]; kols: McnKolRow[] }) {
  const st = kolStats(channels, kols);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-sm">
          <span className="text-2xl font-semibold text-foreground tabular-nums">{st.kolCount}</span>{' '}
          <span className="text-muted-foreground">KOL được gán kênh</span>
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-1.5" aria-label="Kênh của MCN">
        <Stat label="Kênh đã gán" value={st.assigned} />
        <Stat label="Kênh riêng MCN" value={st.own} />
      </ul>
      {st.preview.length > 0 && (
        <ul className="space-y-1.5" aria-label="KOL được gán kênh gần nhất">
          {st.preview.map((k) => (
            <li key={k.kolAccountId} className="flex min-w-0 items-center gap-2 text-sm">
              <KolAvatar name={k.displayName} src={k.avatar} className="size-7 [&_span]:text-[10px]" />
              <span className="min-w-0 flex-1 truncate text-foreground">{k.displayName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{k.assignedChannelCount} kênh</span>
            </li>
          ))}
          {st.kolCount > st.preview.length && (
            <li className="text-xs text-muted-foreground">và {st.kolCount - st.preview.length} KOL khác</li>
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * "Tình trạng hồ sơ": one card per tab of the profile area (Thông tin hồ sơ, Quản lý kênh, MCN: Quản lý KOL)
 * with its submit requirements (and recommended items), stacked in the page's 2/3 column; rows go 2-up on wide cards.
 */
export function OverviewGrid({
  ownerType,
  sections,
  status,
  channels,
  kols,
}: {
  ownerType: OwnerType;
  sections: OverviewSection[];
  status: ProfileStatus;
  channels: Channel[];
  kols: McnKolRow[];
}) {
  const now = Date.now();
  const cards = sections.map((s) => {
    if (s.key === 'kenh') {
      return (
        <SectionCard
          key={s.key}
          section={s}
          summary={<ChannelSummary channels={channels} now={now} />}
          actions={
            <>
              {channels.length === 0 && (
                <Button asChild className={btn}>
                  <Link to={profilePath(ownerType, 'kenh', { openAddChannel: true })}>
                    <Plus aria-hidden />
                    Thêm kênh
                  </Link>
                </Button>
              )}
              <SectionLink section={s} />
            </>
          }
        />
      );
    }
    if (s.key === 'kol') {
      const canAssign = canManageKolAssignments(status);
      return (
        <SectionCard
          key={s.key}
          section={s}
          summary={<KolSummary channels={channels} kols={kols} />}
          actions={
            <>
              {kols.length === 0 && canAssign && channels.length > 0 && (
                <Button asChild className={btn}>
                  <Link to={mcnKolsPath({ openAssign: true })}>
                    <UserPlus aria-hidden />
                    Gán kênh cho KOL
                  </Link>
                </Button>
              )}
              <SectionLink section={s} />
            </>
          }
        />
      );
    }
    return <SectionCard key={s.key} section={s} actions={<SectionLink section={s} />} />;
  });

  return (
    <section aria-label="Tình trạng hồ sơ">
      <div className="grid gap-4">
        {cards.map((c) => (
          <div key={c.key} className="@container/card flex min-w-0 [&>*]:min-w-0 [&>*]:flex-1">
            {c}
          </div>
        ))}
      </div>
    </section>
  );
}
