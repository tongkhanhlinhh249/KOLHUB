import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { cn } from '../../components/ui/utils';

/**
 * Search box bound to a committed keyword (usually a URL param): commits 300 ms after typing stops
 * (empty text → undefined) and follows external changes (clear filters, browser back).
 */
export function KeywordSearch({
  keyword,
  onKeywordChange,
  placeholder,
  label,
  className,
  inputClassName,
}: {
  keyword: string | undefined;
  onKeywordChange(keyword: string | undefined): void;
  placeholder: string;
  label: string;
  className?: string;
  inputClassName?: string;
}) {
  const [text, setText] = useState(keyword ?? '');
  const committed = useRef(keyword ?? '');
  const onKeywordRef = useRef(onKeywordChange);
  onKeywordRef.current = onKeywordChange;

  // Follow external keyword changes but not our own commits.
  useEffect(() => {
    const kw = keyword ?? '';
    if (kw !== committed.current) {
      committed.current = kw;
      setText(kw);
    }
  }, [keyword]);

  useEffect(() => {
    if (text === committed.current) return;
    const id = window.setTimeout(() => {
      committed.current = text;
      onKeywordRef.current(text.trim() ? text : undefined);
    }, 300);
    return () => window.clearTimeout(id);
  }, [text]);

  return (
    <div role="search" className={cn('relative min-w-0', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={cn('h-10 bg-card pl-9', inputClassName)}
      />
    </div>
  );
}
