import { LayoutGrid, List } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';

/** Result layout: full-width list rows (default) or grid of cards. */
export type ResultView = 'grid' | 'list';

const OPTIONS = [
  { key: 'list', label: 'Danh sách', Icon: List },
  { key: 'grid', label: 'Lưới', Icon: LayoutGrid },
] as const;

/** "Danh sách / Lưới" switch shown above a result list. */
export function ViewToggle({
  value,
  onChange,
  className,
}: {
  value: ResultView;
  onChange(v: ResultView): void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Kiểu hiển thị"
      className={cn('flex items-center gap-1 rounded-md border border-border p-0.5', className)}
    >
      {OPTIONS.map(({ key, label, Icon }) => (
        <Button
          key={key}
          type="button"
          variant={value === key ? 'secondary' : 'ghost'}
          size="sm"
          className="h-11 md:h-8"
          aria-pressed={value === key}
          aria-label={`Xem dạng ${label.toLowerCase()}`}
          title={label}
          onClick={() => onChange(key)}
        >
          <Icon aria-hidden />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
}
