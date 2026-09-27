import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from './ui/utils';
import { initialsOf } from '../auth/useIdentity';
import type { DisplayIdentity } from '../services';

/** Profile avatar of a display identity, initials when there is no image. */
export function IdentityAvatar({ identity, className }: { identity: DisplayIdentity; className?: string }) {
  return (
    <Avatar className={cn('size-8', className)}>
      {identity.avatar && <AvatarImage src={identity.avatar} alt="" className="object-cover" />}
      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initialsOf(identity.name)}</AvatarFallback>
    </Avatar>
  );
}
