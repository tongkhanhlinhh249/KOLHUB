import { Hourglass } from 'lucide-react';

/** Temporary page for screens delivered in later phases. */
export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Hourglass className="size-6" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{note}</p>
    </div>
  );
}
