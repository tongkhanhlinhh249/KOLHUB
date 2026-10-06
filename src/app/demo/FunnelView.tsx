import { useState } from 'react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../auth/AuthContext';
import { formatDuration, funnelService, normalizeEmail } from '../services';
import { useLiveQuery } from '../features/shared/useLiveQuery';
import { DemoPanelSection } from './DemoPanelSection';

/** Demo Panel block "Phễu": timestamps of each onboarding step for one subject (email). */
export function FunnelView() {
  const { account } = useAuth();
  const subjects = useLiveQuery(async () => funnelService.subjects(), []);
  const [picked, setPicked] = useState<string | null>(null);
  const list = subjects.data ?? [];
  const mine = account ? normalizeEmail(account.email) : '';
  const subject = picked && list.includes(picked) ? picked : list.includes(mine) ? mine : list[0];
  const rows = useLiveQuery(async () => (subject ? funnelService.get(subject) : []), [subject]);

  return (
    <DemoPanelSection title="Phễu đăng ký" description="Thời điểm hoàn thành từng bước của một hành trình.">
      {!list.length ? (
        <p className="text-xs text-muted-foreground">Chưa có hành trình nào. Hãy đăng ký một tài khoản KOL mới.</p>
      ) : (
        <div className="space-y-3">
          <Select value={subject} onValueChange={setPicked}>
            <SelectTrigger className="h-11 w-full md:h-10" aria-label="Chọn hành trình">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {list.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ol className="space-y-1.5">
            {(rows.data ?? []).map((r) => (
              <li key={r.step} className="flex items-baseline justify-between gap-2 text-xs">
                <span className={r.at !== undefined ? 'text-foreground' : 'text-muted-foreground'}>{r.label}</span>
                <span className="shrink-0 text-right text-muted-foreground">
                  {r.at !== undefined ? format(r.at, 'HH:mm:ss dd/MM') : '—'}
                  {r.sincePrevMs !== undefined && <span className="ml-1 text-primary">+{formatDuration(r.sincePrevMs)}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </DemoPanelSection>
  );
}
