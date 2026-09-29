// Sàn v2 building blocks: match pill + reasons, bookmark toggle, "Nhãn hàng" block.
import { useState } from 'react';
import { Bookmark, BookmarkCheck, Building2, CalendarDays, Check, CircleAlert, Handshake, Loader2, Megaphone, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import { campaignService, type CampaignMatch, type MarketplaceBrandInfo } from '../../services';
import { ToneBadge } from '../shared/StatusBadges';
import { errText } from './parts';
import { matchLabel, matchTone, memberSinceText } from './supplierBooking';

/** "Khớp 86%" pill (green ≥ 70, orange ≥ 40, grey below). */
export function MatchPill({ match, className }: { match: CampaignMatch; className?: string }) {
  return (
    <ToneBadge tone={matchTone(match.score)} className={className}>
      <span className="sr-only">Mức phù hợp: </span>
      {matchLabel(match.score)}
    </ToneBadge>
  );
}

/** Top reasons of a match as small check lines (card: 2). */
export function MatchReasons({ match, max, className }: { match: CampaignMatch; max?: number; className?: string }) {
  const list = max === undefined ? match.reasons : match.reasons.slice(0, max);
  if (list.length === 0) return null;
  return (
    <ul className={cn('flex flex-col gap-1', className)} aria-label="Lý do phù hợp">
      {list.map((r) => (
        <li key={r} className="flex items-start gap-1.5 text-xs text-foreground">
          <Check className="mt-0.5 size-3.5 shrink-0 text-chart-4" aria-hidden />
          <span className="min-w-0 break-words">{r}</span>
        </li>
      ))}
    </ul>
  );
}

/** Detail sheet: score, every reason and what is missing. */
export function MatchDetails({ match }: { match: CampaignMatch }) {
  return (
    <div className="space-y-3 rounded-[8px] border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <MatchPill match={match} />
        <p className="text-xs text-muted-foreground">Dựa trên kênh đã xác thực, lĩnh vực KOL và quy mô kênh của bạn.</p>
      </div>
      <MatchReasons match={match} />
      {match.missing.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-border pt-3" aria-label="Còn thiếu">
          {match.missing.map((m) => (
            <li key={m} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-chart-5" aria-hidden />
              <span className="min-w-0 break-words">{m}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Save / unsave a marketplace campaign with a toast. */
function useSaveToggle(campaignId: string, saved: boolean, name: string) {
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (saved) {
        await campaignService.unsaveCampaign(campaignId);
        toast.success('Đã bỏ lưu chiến dịch', { description: name });
      } else {
        await campaignService.saveCampaign(campaignId);
        toast.success('Đã lưu chiến dịch', { description: `${name} — xem lại ở tab Đã lưu.` });
      }
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, toggle };
}

/** Bookmark icon button (44 px below md). Sits above the card's stretched title button. */
export function SaveIconButton({ campaignId, saved, name, className }: { campaignId: string; saved: boolean; name: string; className?: string }) {
  const { busy, toggle } = useSaveToggle(campaignId, saved, name);
  const Icon = saved ? BookmarkCheck : Bookmark;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-pressed={saved}
      aria-label={saved ? `Bỏ lưu chiến dịch ${name}` : `Lưu chiến dịch ${name}`}
      title={saved ? 'Bỏ lưu' : 'Lưu chiến dịch'}
      disabled={busy}
      onClick={() => void toggle()}
      className={cn('relative z-10 size-11 shrink-0 md:size-8', saved ? 'text-primary hover:text-primary' : 'text-muted-foreground', className)}
    >
      {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Icon className={cn(saved && 'fill-primary/15')} aria-hidden />}
    </Button>
  );
}

/** "Lưu" / "Đã lưu" outline button for the detail footer. */
export function SaveButton({ campaignId, saved, name, className }: { campaignId: string; saved: boolean; name: string; className?: string }) {
  const { busy, toggle } = useSaveToggle(campaignId, saved, name);
  const Icon = saved ? BookmarkCheck : Bookmark;
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={saved}
      disabled={busy}
      onClick={() => void toggle()}
      className={cn('h-11 md:h-9', saved && 'border-primary/40 text-primary hover:text-primary', className)}
    >
      {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Icon aria-hidden />}
      {saved ? 'Đã lưu' : 'Lưu'}
    </Button>
  );
}

/** Compact "Nhãn hàng" block of the detail sheet (public facts only). */
export function BrandInfoBlock({ info }: { info: MarketplaceBrandInfo }) {
  const since = memberSinceText(info.memberSince);
  const facts = [
    { icon: Megaphone, label: 'Chiến dịch đã đăng', value: String(info.campaignsPosted) },
    { icon: Handshake, label: 'Booking hoàn tất trên KOLHUB', value: String(info.completedBookings) },
    ...(since ? [{ icon: CalendarDays, label: 'Tham gia từ', value: since }] : []),
  ];
  return (
    <div className="space-y-3 rounded-[8px] border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
          <Building2 className="size-4" aria-hidden />
        </span>
        <p className="min-w-0 flex-1 text-sm font-semibold break-words text-foreground">{info.company}</p>
        {info.businessEmailVerified && (
          <ToneBadge tone="success">
            <ShieldCheck className="size-3.5" aria-hidden />
            Email doanh nghiệp đã xác thực
          </ToneBadge>
        )}
      </div>
      <dl className="grid grid-cols-1 gap-3 @sm:grid-cols-3">
        {facts.map((f) => (
          <div key={f.label} className="flex min-w-0 items-center gap-2">
            <f.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">{f.label}</dt>
              <dd className="text-sm font-medium text-foreground tabular-nums">{f.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
