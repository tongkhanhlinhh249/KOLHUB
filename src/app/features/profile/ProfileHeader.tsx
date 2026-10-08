import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { Camera, Check, Loader2, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { cn } from '../../components/ui/utils';
import { profileDisplayName, profileService, validateProofImage, type ProfileView } from '../../services';
import { toStoredFile } from '../shared/files';
import { milestoneBadge } from './primaryAction';
import { ProfileAvatar } from './ProfileAvatar';

interface ProfileHeaderProps {
  view: ProfileView;
  /** Opens the "Gửi hồ sơ xét duyệt" modal; the button shows only while the profile can be sent. */
  onSubmit(): void;
}

function errorText(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

/** Image picker button: JPG/PNG ≤ 10 MB (4203), stored as a thumbnail. */
function ImageButton({ label, kind, accountId, className }: { label: string; kind: 'avatar' | 'cover'; accountId: string; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      validateProofImage({ name: file.name, type: file.type, size: file.size });
      const stored = await toStoredFile(file);
      await profileService.updateImages(accountId, { [kind]: stored });
      toast.success(kind === 'avatar' ? 'Đã cập nhật ảnh đại diện' : 'Đã cập nhật ảnh bìa');
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <input ref={input} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => void onPick(e.target.files?.[0])} />
      <Button
        type="button"
        size="icon"
        variant="secondary"
        aria-label={label}
        disabled={busy}
        onClick={() => input.current?.click()}
        className={cn('size-9 rounded-full border border-border shadow-sm', className)}
      >
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Camera aria-hidden />}
      </Button>
    </>
  );
}

/** SCR-03 — profile header (on "Tổng quan hồ sơ" only): cover, avatar, name + shield, completeness box with "Gửi xét duyệt" (DRAFT / NEEDS_FIX). Status lives in "Trạng thái xét duyệt". */
export function ProfileHeader({ view, onSubmit }: ProfileHeaderProps) {
  const { profile, completeness } = view;
  // Same name + initials as the topbar identity (identityOf), so both always match.
  const name = profileDisplayName(profile);
  const shownName = name || 'Chưa đặt tên';
  const publicId = profile.ownerType === 'KOL' ? profile.kolId : profile.mcnId;
  // The one action here (KOL + MCN): open the submit modal while the profile can be sent.
  const canSubmit = profile.status === 'DRAFT' || profile.status === 'NEEDS_FIX';

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="relative h-32 bg-muted md:h-48">
        {profile.cover?.thumbnail && <img src={profile.cover.thumbnail} alt="Ảnh bìa" className="size-full object-cover" />}
        <ImageButton label="Đổi ảnh bìa" kind="cover" accountId={profile.accountId} className="absolute right-3 bottom-3" />
      </div>

      <div className="px-4 pt-3 pb-4 md:px-6 md:pb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex min-w-0 items-end gap-3">
            <div className="relative -mt-12 shrink-0">
              <ProfileAvatar name={name || profile.contact.email} src={profile.avatar?.thumbnail} />
              <ImageButton label="Đổi ảnh đại diện" kind="avatar" accountId={profile.accountId} className="absolute -right-1 -bottom-1 size-8" />
            </div>
            <div className="min-w-0 space-y-1 pb-0.5">
              <div className="flex min-w-0 items-center gap-1.5">
                <h2 className={cn('truncate text-lg font-semibold', name ? 'text-foreground' : 'text-muted-foreground')}>{shownName}</h2>
                {profile.status === 'APPROVED' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex" tabIndex={0} aria-label="Hồ sơ đã được duyệt">
                        <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Hồ sơ đã được duyệt</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                {publicId && (
                  <span>
                    {profile.ownerType === 'KOL' ? 'KOL ID' : 'MCN ID'}: <span className="font-medium text-foreground">{publicId}</span>
                  </span>
                )}
                <span>{view.channelCount} kênh</span>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-4 space-y-3 rounded-lg bg-muted/60 p-3 md:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-foreground">Hồ sơ hoàn thiện {completeness.percent}%</p>
            {canSubmit && (
              <Button type="button" className="h-11 w-full sm:h-9 sm:w-auto" onClick={onSubmit}>
                <Send aria-hidden />
                Gửi xét duyệt
              </Button>
            )}
          </div>
          <Progress value={completeness.percent} className="h-2" aria-label={`Hồ sơ hoàn thiện ${completeness.percent}%`} />
          <ul className="flex flex-wrap gap-2" aria-label="Các bước hoàn thiện hồ sơ">
            {completeness.milestones.filter((m) => m.key !== 'submitted').map((m) => {
              const badge = milestoneBadge(profile.ownerType, m.key);
              const pill = 'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm';
              return (
                <li key={m.key}>
                  {m.done ? (
                    <span className={cn(pill, 'border-primary/30 bg-primary/10 font-medium text-primary')} title={m.label}>
                      <Check className="size-4 shrink-0" aria-hidden />
                      {badge.label}
                      <span className="sr-only">, đã xong</span>
                    </span>
                  ) : (
                    <Link
                      to={badge.to}
                      title={m.label}
                      className={cn(
                        pill,
                        'border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      )}
                    >
                      {badge.label}
                      <span className="sr-only">, chưa xong</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Card>
  );
}
