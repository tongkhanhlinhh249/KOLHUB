import { useId } from 'react';
import { Lock, Trophy, X } from 'lucide-react';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { cn } from '../../components/ui/utils';
import { BIO_MAX, FIELD_LIMIT, KOL_CATEGORIES, type ActivityField, type FieldMedal } from '../../services';

const fieldKey = (s: string) => s.trim().toLocaleLowerCase('vi');

const MEDAL: Record<Exclude<FieldMedal, 'none'>, { icon: string; label: string }> = {
  // Amber is the one allowed non-token colour, used only for the gold medal (as in biz-search/KolMedia).
  gold: { icon: 'text-amber-500', label: 'Huy chương vàng' },
  silver: { icon: 'text-muted-foreground', label: 'Huy chương bạc' },
};

/** Initial "Lĩnh vực hoạt động" of the edit form: stored fields normalised against the category. */
export function initialFields(fields: ActivityField[] | undefined, category: string): ActivityField[] {
  const prev = fields ?? [];
  if (prev.length && fieldKey(prev[0].name) === fieldKey(category)) return prev;
  return followCategory(prev.length ? [{ name: '', medal: 'none' }, ...prev] : prev, category, prev);
}

/** Mirror of the service rule: first field follows the category, no duplicate of it, max FIELD_LIMIT. */
export function followCategory(prev: ActivityField[], category: string, known: ActivityField[]): ActivityField[] {
  if (!category) return [];
  const key = fieldKey(category);
  const medal = [...prev, ...known].find((f) => fieldKey(f.name) === key)?.medal ?? 'none';
  const rest = prev.slice(1).filter((f) => fieldKey(f.name) !== key);
  return [{ name: category, medal }, ...rest].slice(0, FIELD_LIMIT);
}

export function bioLength(bio: string): number {
  return [...bio.trim()].length;
}

/** "Giới thiệu" textarea with a live x/300 counter. */
export function BioField({
  value,
  onChange,
  error,
  placeholder,
}: {
  value: string;
  onChange(v: string): void;
  error?: string;
  placeholder: string;
}) {
  const id = useId();
  const count = bioLength(value);
  const over = count > BIO_MAX;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>Giới thiệu</Label>
        <span id={`${id}-count`} className={cn('text-xs tabular-nums', over ? 'text-destructive' : 'text-muted-foreground')} aria-live="polite">
          {count}/{BIO_MAX}
        </span>
      </div>
      <Textarea
        id={id}
        rows={4}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error || over ? true : undefined}
        aria-describedby={[`${id}-count`, error ? `${id}-error` : null].filter(Boolean).join(' ')}
        className={cn('resize-y', (error || over) && 'border-destructive')}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function MedalIcon({ medal }: { medal: FieldMedal }) {
  if (medal === 'none') return null;
  const m = MEDAL[medal];
  return (
    <>
      <Trophy className={cn('size-3 shrink-0', m.icon)} aria-hidden />
      <span className="sr-only">({m.label})</span>
    </>
  );
}

/**
 * "Lĩnh vực hoạt động" editor: the first chip is the category ("Lĩnh vực chính", locked, synced with
 * the category select); up to FIELD_LIMIT − 1 more from KOL_CATEGORIES. Medals are read-only.
 */
export function ActivityFieldsEditor({
  fields,
  onChange,
  error,
}: {
  fields: ActivityField[];
  onChange(next: ActivityField[]): void;
  error?: string;
}) {
  const id = useId();
  const taken = new Set(fields.map((f) => fieldKey(f.name)));
  const options = KOL_CATEGORIES.filter((c) => !taken.has(fieldKey(c)));
  const canAdd = fields.length > 0 && fields.length < FIELD_LIMIT && options.length > 0;

  return (
    <div className="space-y-2" role="group" aria-labelledby={`${id}-label`} aria-describedby={error ? `${id}-error` : `${id}-hint`}>
      <Label id={`${id}-label`}>Lĩnh vực hoạt động *</Label>
      <ul className="flex flex-wrap gap-1.5">
        {fields.map((f, i) => (
          <li
            key={f.name}
            className={cn(
              'inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full px-2.5 text-xs font-medium',
              i === 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground',
            )}
          >
            {i === 0 && <Lock className="size-3 shrink-0" aria-hidden />}
            <MedalIcon medal={f.medal} />
            <span className="truncate">{f.name}</span>
            {i === 0 ? (
              <span className="text-[10px] font-normal text-primary/80">Lĩnh vực chính</span>
            ) : (
              <button
                type="button"
                onClick={() => onChange(fields.filter((_, j) => j !== i))}
                aria-label={`Bỏ lĩnh vực ${f.name}`}
                className="-mr-1 flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </li>
        ))}
        {fields.length === 0 && <li className="text-xs text-muted-foreground">Chọn Lĩnh vực chính trước.</li>}
      </ul>
      {canAdd && (
        // Remount after each pick so the Select goes back to its placeholder.
        <Select key={fields.length} onValueChange={(v) => onChange([...fields, { name: v, medal: 'none' }])}>
          <SelectTrigger className="h-11 md:h-9 md:w-60" aria-label="Thêm lĩnh vực hoạt động">
            <SelectValue placeholder={`Thêm lĩnh vực (tối đa ${FIELD_LIMIT})`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          Từ 1 đến {FIELD_LIMIT} lĩnh vực; lĩnh vực đầu tiên là Lĩnh vực chính.
        </p>
      )}
    </div>
  );
}
