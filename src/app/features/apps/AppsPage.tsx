import { BadgeCheck, ExternalLink, Plus, ShieldCheck, type LucideIcon } from 'lucide-react';
import { cn } from '../../components/ui/utils';
import { SAFETY_TOOL_URL } from './safetyTool';

interface AppTile {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Icon square colours. */
  tint: string;
  badge?: string;
}

const APPS: AppTile[] = [
  {
    key: 'kol-safety',
    name: 'KOL Safety',
    description: 'Kiểm tra video trước khi đăng, theo dõi kênh TikTok, YouTube, Facebook.',
    icon: ShieldCheck,
    tint: 'bg-emerald-500 text-white',
    badge: 'Đã bật',
  },
  {
    key: 'brand-safety',
    name: 'Brand Safety',
    description: 'Đối chiếu video KOL với bộ quy tắc quảng cáo của nhãn hàng.',
    icon: BadgeCheck,
    tint: 'bg-primary text-primary-foreground',
    badge: 'Đã bật',
  },
];

const tileClass =
  'group flex h-full min-h-20 items-center gap-3 rounded-[8px] border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

/**
 * "Ứng dụng": the content-review apps (KOL Safety, Brand Safety) as a tile grid, like an app launcher.
 * Every tile opens the external AI Video Analysis tool in a new tab; "Thêm ứng dụng" too, until an app
 * catalogue exists. On/Off per plan is shown with the badge.
 */
export function AppsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
      <section aria-labelledby="apps-review" className="space-y-3">
        <h2 id="apps-review" className="text-base font-semibold text-foreground">
          Kiểm duyệt nội dung
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {APPS.map((a) => (
            <li key={a.key}>
              <a href={SAFETY_TOOL_URL} target="_blank" rel="noopener noreferrer" className={tileClass}>
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
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{a.description}</span>
                </span>
                <ExternalLink className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
                <span className="sr-only">(mở tab mới)</span>
              </a>
            </li>
          ))}
          <li>
            <a href={SAFETY_TOOL_URL} target="_blank" rel="noopener noreferrer" className={tileClass}>
              <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-muted text-muted-foreground">
                <Plus className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-foreground">Thêm ứng dụng</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">Xem các gói và bật thêm tính năng.</span>
              </span>
              <ExternalLink className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
              <span className="sr-only">(mở tab mới)</span>
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
