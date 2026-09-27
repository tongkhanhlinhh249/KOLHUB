import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

/** One label/value field of a profile section: small muted label above the value. */
export function InfoRow({ label, value, required, extra }: { label: string; value: string; required?: boolean; extra?: ReactNode }) {
  const empty = !value.trim();
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">
        {label}
        {required && empty && (
          <span className="ml-0.5 text-destructive" aria-label="bắt buộc">
            *
          </span>
        )}
      </dt>
      <dd className={empty ? 'text-sm text-muted-foreground' : 'break-words text-sm text-foreground'}>
        {empty ? 'Chưa cập nhật' : value}
      </dd>
      {extra}
    </div>
  );
}

interface SectionCardProps {
  title: string;
  /** Pencil icon button that opens the section's edit dialog. */
  onEdit?(): void;
  /** Custom header action instead of the pencil (e.g. "Đổi email"). */
  action?: ReactNode;
  children: ReactNode;
}

/** Profile section card (KOL/MCN profile, Brand account): title, edit affordance, 2-column field list on md. */
export function SectionCard({ title, onEdit, action, children }: SectionCardProps) {
  return (
    <Card className="gap-4 py-4 md:py-5">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 md:px-6">
        <CardTitle className="text-base">{title}</CardTitle>
        {action ??
          (onEdit && (
            <Button type="button" variant="ghost" size="icon" className="size-11 md:size-9" aria-label={`Sửa ${title}`} onClick={onEdit}>
              <Pencil aria-hidden />
            </Button>
          ))}
      </CardHeader>
      <CardContent className="px-4 md:px-6">
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</dl>
      </CardContent>
    </Card>
  );
}
