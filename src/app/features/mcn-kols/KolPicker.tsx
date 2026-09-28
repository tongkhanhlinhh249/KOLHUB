import { useEffect, useId, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { cn } from '../../components/ui/utils';
import { mcnKolService, type KolPickItem } from '../../services';
import { KolAvatar, kolMeta } from './McnKolRow';

function KolLine({ kol }: { kol: KolPickItem }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <KolAvatar name={kol.displayName} src={kol.avatar} className="size-10" />
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground">{kol.displayName}</span>
        <span className="block truncate text-xs text-muted-foreground">{kolMeta(kol)}</span>
      </span>
    </span>
  );
}

/**
 * Pick one approved KOL: search by name, KOL ID or login email (300 ms debounce, max 20 results).
 * Once picked, shows the KOL with "Đổi KOL".
 */
export function KolPicker({ value, onChange }: { value: KolPickItem | null; onChange(kol: KolPickItem | null): void }) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<KolPickItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const id = useId();

  useEffect(() => {
    if (value) return;
    let alive = true;
    setLoading(true);
    const t = window.setTimeout(() => {
      mcnKolService.searchKols(text).then(
        (r) => alive && (setResults(r), setLoading(false)),
        () => alive && (setResults([]), setLoading(false)),
      );
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [text, value]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
        <KolLine kol={value} />
        <Button type="button" variant="outline" className="h-11 shrink-0 md:h-9" onClick={() => onChange(null)}>
          Đổi KOL
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id={id}
          type="search"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tên, KOL ID hoặc email của KOL"
          aria-label="Tìm KOL theo tên, KOL ID hoặc email"
          className="h-11 pl-9 md:h-10"
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-lg border border-border" aria-busy={loading}>
        {loading && !results ? (
          <p className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Đang tìm KOL…
          </p>
        ) : results && results.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Không tìm thấy KOL đã được duyệt phù hợp.</p>
        ) : (
          <ul aria-label="Kết quả tìm KOL" className={cn('divide-y divide-border', loading && 'opacity-60')}>
            {(results ?? []).map((k) => (
              <li key={k.kolAccountId}>
                <button
                  type="button"
                  onClick={() => onChange(k)}
                  className="flex min-h-14 w-full items-center gap-3 px-3 py-2 hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
                >
                  <KolLine kol={k} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
