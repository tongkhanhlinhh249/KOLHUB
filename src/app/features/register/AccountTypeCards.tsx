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

export function AccountTypeCards({ value, onChange }: { value: AccountType; onChange(v: AccountType): void }) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as AccountType)}
      aria-label="Loại tài khoản"
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      {TYPES.map((t) => {
        const selected = value === t.value;
        const id = `account-type-${t.value}`;
        return (
          <Label
            key={t.value}
            htmlFor={id}
            className={cn(
              'relative flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 font-normal transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring sm:flex-col sm:gap-2 sm:p-4',
              selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
            )}
          >
            <RadioGroupItem value={t.value} id={id} aria-label={t.title} className="absolute right-3 top-3" />
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              <t.icon className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 space-y-1 pr-6 sm:pr-0">
              <span className="block text-sm font-semibold text-foreground">{t.title}</span>
              <span className="block text-xs leading-snug text-muted-foreground">{t.desc}</span>
            </span>
          </Label>
        );
      })}
    </RadioGroup>
  );
}
