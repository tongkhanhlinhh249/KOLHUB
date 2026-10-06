import { useState } from 'react';
import { ArrowRight, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { DemoPanelSection } from './DemoPanelSection';
import { DEMO_LINK_GROUPS, EXTERNAL_DEMO_LINKS } from './demoLinks';
import type { RoleTab } from './demoTabs';
import { useDemoOpen } from './useDemoOpen';

const rowClass =
  'flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60 md:min-h-9';

const PREVIEW = 5;

/**
 * "Đường dẫn nhanh" of one role: jump to a demo screen as the right demo account in one click (signs in as that
 * account first when needed).
 */
export function DemoLinksBlock({ tab, onDone }: { tab: RoleTab; onDone(): void }) {
  const { open, busy } = useDemoOpen(onDone);
  const [all, setAll] = useState(false);
  const links = DEMO_LINK_GROUPS.filter((g) => g.tab === tab).flatMap((g) => g.links);
  const shown = all ? links : links.slice(0, PREVIEW);

  return (
    <DemoPanelSection title="Đường dẫn nhanh" count={links.length} description="Tự đăng nhập đúng tài khoản mẫu rồi mở màn cần demo.">
      <ul className="-mx-1">
        {shown.map((l) => (
          <li key={`${l.account}-${l.path}`}>
            <button type="button" className={rowClass} disabled={busy !== null} onClick={() => void open(l)}>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-foreground">{l.label}</span>
                {l.hint && <span className="block text-xs text-muted-foreground">{l.hint}</span>}
              </span>
              {busy === l.label ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
              ) : (
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
            </button>
          </li>
        ))}
      </ul>
      {links.length > PREVIEW && (
        <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setAll((a) => !a)}>
          {all ? 'Thu gọn' : `Xem tất cả (${links.length})`}
        </Button>
      )}
    </DemoPanelSection>
  );
}

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
