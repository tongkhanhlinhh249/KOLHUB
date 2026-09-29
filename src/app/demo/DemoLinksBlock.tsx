import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { authService, DEMO_ACCOUNTS, normalizeEmail } from '../services';
import { DemoPanelSection } from './DemoPanelSection';
import { DEMO_LINK_GROUPS, EXTERNAL_DEMO_LINKS, type DemoLink } from './demoLinks';

const rowClass =
  'flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60 md:min-h-9';

/**
 * "Đường dẫn nhanh": jump to a demo screen as the right demo account in one click (signs in as that
 * account first when needed), plus links outside the app.
 */
export function DemoLinksBlock({ onDone }: { onDone(): void }) {
  const { account, setAccount } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const currentEmail = account?.email ? normalizeEmail(account.email) : '';

  const open = async (link: DemoLink) => {
    const target = DEMO_ACCOUNTS.find((d) => d.key === link.account);
    if (!target?.email || busy) return;
    if (normalizeEmail(target.email) === currentEmail) {
      navigate(link.path);
      onDone();
      return;
    }
    setBusy(link.label);
    try {
      const next = await authService.quickLogin(link.account);
      // AccessGuard navigates to `link.path` once the new role is applied.
      setAccount(next, link.path);
      toast.success(`Đã chuyển sang ${target.label}`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không mở được đường dẫn.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <DemoPanelSection title="Đường dẫn nhanh" description="Bấm để tự chuyển đúng vai trò và mở màn cần demo.">
      <div className="space-y-3">
        {DEMO_LINK_GROUPS.map((g) => (
          <div key={g.title} className="space-y-0.5">
            <p className="px-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{g.title}</p>
            <ul>
              {g.links.map((l) => (
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
          </div>
        ))}
        <div className="space-y-0.5 border-t border-border pt-3">
          <p className="px-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Liên kết ngoài</p>
          <ul>
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
        </div>
      </div>
    </DemoPanelSection>
  );
}
