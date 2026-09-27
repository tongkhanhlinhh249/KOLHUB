import { useId, useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, type InputProps } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { cn } from '../../components/ui/utils';
import { InvalidInputError, KolhubError } from '../../services';

interface FieldProps extends Omit<InputProps, 'id'> {
  label: string;
  error?: string;
  hint?: ReactNode;
  password?: boolean;
}

/** Labelled input with hint and error text wired via aria-describedby. */
export function Field({ label, error, hint, password, className, type, ...props }: FieldProps) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={password ? (shown ? 'text' : 'password') : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn('h-11 md:h-10', password && 'pr-11', error && 'border-destructive', className)}
          {...props}
        />
        {password && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={shown}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[8px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {shown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export type FieldErrors = Partial<Record<string, string>>;

/** Split a service error into a per-field message or a general one. */
export function splitError(e: unknown, fields: string[]): { field?: string; message: string } {
  if (e instanceof InvalidInputError && fields.includes(e.field)) return { field: e.field, message: e.message };
  if (e instanceof KolhubError && e.meta?.field && fields.includes(e.meta.field)) {
    return { field: e.meta.field, message: e.message };
  }
  if (e instanceof Error && e.message) return { message: e.message };
  return { message: 'Đã có lỗi xảy ra. Vui lòng thử lại.' };
}

export const PASSWORD_HINT = 'Tối thiểu 8 ký tự, có cả chữ và số.';
