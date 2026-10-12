import { Link } from 'react-router';
import { ChevronRight, ExternalLink, ShieldCheck, type LucideIcon } from 'lucide-react';
import { cn } from '../../components/ui/utils';
import { useAuth } from '../../auth/AuthContext';
import { KOL_SAFETY_PATH } from '../../auth/roles';
import { SAFETY_TOOL_URL } from './safetyTool';

interface AppTile {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Icon square colours. */
  tint: string;
  badge?: string;
  /** In-app page for KOL/MCN (the tile opens it; the external tool stays one click away). */
  creatorPath?: string;
}

const APPS: AppTile[] = [
  {
    key: 'kol-safety',
    name: 'KOL Safety',
    description: 'Kiểm tra video trước khi đăng, theo dõi kênh TikTok, YouTube, Facebook, Instagram.',
    icon: ShieldCheck,
    tint: 'bg-emerald-500 text-white',
    badge: 'Đã bật',
    creatorPath: KOL_SAFETY_PATH,
  },
];

const tileClass =
  'group flex h-full min-h-20 items-center gap-3 rounded-[8px] border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

/**
 * "Ứng dụng": the content-review app (KOL Safety) as a tile, like an app launcher. For KOL/MCN it opens the
 * in-app "Tổng hợp kênh" demo page, with a secondary "Mở công cụ đầy đủ" link to the external AI Video Analysis
 * tool; for other accounts the tile opens that tool in a new tab.
 */
export function AppsPage() {
  const { account } = useAuth();
  const isCreator = account?.type === 'KOL' || account?.type === 'MCN';
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <section aria-labelledby="apps-review" className="space-y-3">
        <h2 id="apps-review" className="text-base font-semibold text-foreground">
          Kiểm duyệt nội dung
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {APPS.map((a) => {
            const inApp = isCreator && a.creatorPath;
            const body = (
              <>
                <span className={cn('grid size-11 shrink-0 place-items-center rounded-[10px]', a.tint)}>
                  <a.icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className="font-semibold text-foreground">{a.name}</span>
                    {a.badge && (
                      <span className="shrink-0 rounded-[4px] bg-chart-4/15 px-1.5 py-px text-[10px] font-semibold text-chart-4 uppercase">
                        {a.badge}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                    {inApp ? 'Tổng hợp 30 nội dung đã quét của kênh: điểm an toàn, vấn đề và khuyến nghị.' : a.description}
                  </span>
                </span>
              </>
            );
            if (inApp) {
              return (
                <li key={a.key} className="relative h-full">
                  <Link to={a.creatorPath!} className={cn(tileClass, 'pb-9')}>
                    {body}
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
                  </Link>
                  <a
                    href={SAFETY_TOOL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2 bottom-1 inline-flex min-h-8 items-center gap-1 rounded-[8px] px-1 text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    Mở công cụ đầy đủ
                    <ExternalLink className="size-3" aria-hidden />
                    <span className="sr-only">(mở tab mới)</span>
                  </a>
                </li>
              );
            }
            return (
              <li key={a.key}>
                <a href={SAFETY_TOOL_URL} target="_blank" rel="noopener noreferrer" className={tileClass}>
                  {body}
                  <ExternalLink className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
                  <span className="sr-only">(mở tab mới)</span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
