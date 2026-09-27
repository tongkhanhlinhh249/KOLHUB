import { Building2, UserRound, Users, type LucideIcon } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import { cn } from '../../components/ui/utils';
import type { AccountType } from '../../services';

const TYPES: { value: AccountType; icon: LucideIcon; title: string; desc: string }[] = [
  { value: 'KOL', icon: UserRound, title: 'Cá nhân/KOL', desc: 'Người sáng tạo nội dung hoạt động cá nhân' },
  { value: 'MCN', icon: Users, title: 'Tổ chức/MCN', desc: 'Doanh nghiệp quản lý nhiều kênh và KOL' },
  { value: 'BIZ', icon: Building2, title: 'Nhãn hàng/Agency', desc: 'Doanh nghiệp, đại lý tìm và hợp tác với KOL' },
];

interface Props {
  value: AccountType;
  onChange(v: AccountType): void;
  /** Accessible name of the radiogroup. */
  label?: string;
}

/**
 * Account-type picker shared by Đăng ký and Đăng nhập. Radiogroup (arrow keys move the choice).
 * Compact rows in a narrow column, three cards (icon on top) once the container is ≥ 24rem.
 */
export function AccountTypeCards({ value, onChange, label = 'Loại tài khoản' }: Props) {
  return (
    <div className="@container">
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as AccountType)}
        aria-label={label}
        className="grid grid-cols-1 gap-2.5 @sm:grid-cols-3 @sm:gap-3"
      >
        {TYPES.map((t) => {
          const selected = value === t.value;
          const id = `account-type-${t.value}`;
          return (
            <Label
              key={t.value}
              htmlFor={id}
              className={cn(
                'relative flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 py-2.5 font-normal transition-[border-color,box-shadow,background-color]',
                'has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-card',
                '@sm:flex-col @sm:items-start @sm:gap-3 @sm:p-4',
                selected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/40 hover:bg-muted/40',
              )}
            >
              <RadioGroupItem
                value={t.value}
                id={id}
                aria-label={t.title}
                className="absolute right-3 top-1/2 -translate-y-1/2 @sm:top-3 @sm:translate-y-0"
              />
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors @sm:size-10',
                  selected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
                )}
              >
                <t.icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 space-y-0.5 pr-7 @sm:space-y-1 @sm:pr-0">
                <span className="block text-sm font-semibold text-foreground">{t.title}</span>
                <span className="block text-xs leading-snug text-muted-foreground @sm:line-clamp-2">{t.desc}</span>
              </span>
            </Label>
          );
        })}
      </RadioGroup>
    </div>
  );
}
