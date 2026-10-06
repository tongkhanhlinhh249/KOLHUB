import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { cn } from '../../components/ui/utils';

// Building blocks of the campaign form (shared by CampaignFormPage and RecruitFormSections).

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="gap-4 py-4 md:py-5">
      <CardHeader className="gap-1 px-4 md:px-6">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4 px-4 md:px-6">{children}</CardContent>
    </Card>
  );
}

/** Label + control + hint/error, wired with aria-describedby. `id` is the control's id. */
export function FormRow({
  id,
  label,
  optional,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  children: (describedBy: string | undefined) => ReactNode;
}) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-muted-foreground"> (không bắt buộc)</span>}
      </Label>
      {children(describedBy)}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Toggle chip for multi-select lists (platforms, categories). 44px tall below md. */
export function ChipToggle({ pressed, onClick, children }: { pressed: boolean; onClick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-9',
        pressed ? 'border-primary/60 bg-primary/10 font-medium text-primary' : 'border-border bg-card text-foreground hover:bg-muted',
      )}
    >
      {pressed && <Check className="size-3.5 shrink-0" aria-hidden />}
      {children}
    </button>
  );
}

export function ChipGroup({ id, label, describedBy, invalid, children }: { id: string; label: string; describedBy?: string; invalid?: boolean; children: ReactNode }) {
  return (
    <div
      id={id}
      role="group"
      aria-label={label}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      tabIndex={-1}
      className="flex flex-wrap gap-2 rounded-[8px] focus-visible:outline-none"
    >
      {children}
    </div>
  );
}
