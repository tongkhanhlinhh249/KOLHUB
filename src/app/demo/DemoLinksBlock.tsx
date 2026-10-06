import { ExternalLink } from 'lucide-react';
import { DemoPanelSection } from './DemoPanelSection';
import { EXTERNAL_DEMO_LINKS } from './demoLinks';

const rowClass =
  'flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60 md:min-h-9';

/** Links outside the app (new tab). */
export function ExternalLinksBlock() {
  return (
    <DemoPanelSection title="Liên kết ngoài">
      <ul className="-mx-1">
        {EXTERNAL_DEMO_LINKS.map((l) => (
          <li key={l.href}>
            <a href={l.href} target="_blank" rel="noopener noreferrer" className={rowClass}>
              <span className="min-w-0 flex-1 font-medium text-foreground">{l.label}</span>
              <ExternalLink className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="sr-only">(mở tab mới)</span>
            </a>
          </li>
        ))}
      </ul>
    </DemoPanelSection>
  );
}
