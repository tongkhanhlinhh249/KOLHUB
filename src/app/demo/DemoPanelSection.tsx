import type { ReactNode } from 'react';
import { Badge } from '../components/ui/badge';

/** One block of the demo panel: optional short title, optional count badge, at most one line of description. */
export function DemoPanelSection({
  title,
  description,
  count,
  children,
}: {
  title?: string;
  description?: ReactNode;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5 rounded-xl border border-border p-3">
      {title && (
        <div className="space-y-0.5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {title}
            {count !== undefined && (
              <Badge variant={count ? 'default' : 'secondary'} className="px-1.5 py-0 tabular-nums">
                {count}
              </Badge>
            )}
          </h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Small heading naming the current role's section ("KOL", "Nhãn hàng"…). */
export function DemoGroupHeading({ children }: { children: ReactNode }) {
  return <h2 className="px-1 pt-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{children}</h2>;
}
