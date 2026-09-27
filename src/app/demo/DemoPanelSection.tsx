import type { ReactNode } from 'react';

/** One titled block of the demo panel. Later phases add their own sections (Admin, eKYC, …). */
export function DemoPanelSection({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border p-4">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
