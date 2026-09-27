import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { cn } from '../../components/ui/utils';
import { initialsOf } from '../../auth/useIdentity';

/** Large avatar of a profile / account header; initials match the topbar avatar (`initialsOf`). */
export function ProfileAvatar({ name, src, className }: { name: string; src?: string; className?: string }) {
  return (
    <Avatar className={cn('size-20 border-4 border-card bg-card', className)}>
      {src && <AvatarImage src={src} alt="Ảnh đại diện" className="object-cover" />}
      <AvatarFallback className="bg-primary/10 text-2xl font-semibold text-primary">{initialsOf(name)}</AvatarFallback>
    </Avatar>
  );
}
