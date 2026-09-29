import { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { cn } from '../../components/ui/utils';
import type { StoredFile } from '../../services';

/**
 * "Ảnh chiến dịch": the campaign cover filling its box (object-cover), or a soft gradient + megaphone
 * placeholder when there is none (or the image fails to load). The caller sizes the box (e.g. `aspect-video`).
 * Decorative by default (alt=""): the campaign name is always shown next to it.
 */
export function CampaignCover({
  cover,
  className,
  iconClassName,
  alt = '',
}: {
  cover?: StoredFile | null;
  className?: string;
  iconClassName?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const src = cover?.thumbnail;
  const show = !!src && failed !== src;
  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {show ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(src)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/5 to-muted"
          aria-hidden
        >
          <Megaphone className={cn('size-8 text-primary/50', iconClassName)} />
        </div>
      )}
    </div>
  );
}
