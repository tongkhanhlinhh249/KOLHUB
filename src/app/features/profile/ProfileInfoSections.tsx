import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { cn } from '../../components/ui/utils';
import type { OwnerType } from '../../services';
import type { ProfileAnchor } from './primaryAction';

/** Chips of the in-page nav of "Thông tin hồ sơ", in page order. */
const NAV: { id: ProfileAnchor; label: string }[] = [
  { id: 'dinh-danh', label: 'Định danh' },
  { id: 'lien-he', label: 'Liên hệ' },
  { id: 'nhan-su', label: 'Nhân sự' },
];

/**
 * One block of "Thông tin hồ sơ" (#dinh-danh, #lien-he, #nhan-su). The scroll margin keeps the block
 * clear of the in-page nav, which is sticky from md up.
 */
export function ProfileInfoSection({ id, label, children }: { id: ProfileAnchor; label: string; children: ReactNode }) {
  return (
    <section id={id} aria-label={label} className="scroll-mt-4 md:scroll-mt-16">
      {children}
    </section>
  );
}

/** Compact "Định danh · Liên hệ (· Nhân sự for MCN)" chips that jump to the blocks of "Thông tin hồ sơ". */
export function ProfileInfoNav({ ownerType }: { ownerType: OwnerType }) {
  const { hash } = useLocation();
  const current = hash.replace(/^#/, '');
  const nav = ownerType === 'KOL' ? NAV.filter((n) => n.id !== 'nhan-su') : NAV;
  return (
    <nav aria-label="Mục trong trang" className="z-10 bg-background/95 backdrop-blur md:sticky md:top-0 md:py-2">
      <ul className="flex flex-wrap gap-2">
        {nav.map((n) => (
          <li key={n.id}>
            <Link
              to={{ hash: `#${n.id}` }}
              replace
              aria-current={current === n.id ? 'location' : undefined}
              className={cn(
                'inline-flex h-9 items-center rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                current === n.id
                  ? 'border-primary/30 bg-primary/10 font-medium text-primary'
                  : 'border-border bg-card text-foreground hover:bg-muted',
              )}
            >
              {n.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
