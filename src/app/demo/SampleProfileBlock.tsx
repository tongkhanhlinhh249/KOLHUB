import { useState } from 'react';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { useAuth } from '../auth/AuthContext';
import { demoService, profileService, reviewService, type ChannelVerdict, type ProfileStatus } from '../services';
import { ToneBadge, type Tone } from '../features/shared/StatusBadges';
import { useLiveQuery } from '../features/shared/useLiveQuery';
import { DemoPanelSection } from './DemoPanelSection';
import { EkycScenarioPicker } from './EkycScenarioPicker';
import { PROFILE_STATE_LABEL, profileActions, ROLE_ACCOUNTS, showsEkyc, type ProfileAction } from './demoTabs';
import { useRoleSwitch } from './RoleSwitcher';

const TONE: Record<ProfileStatus, Tone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  APPROVED: 'success',
  NEEDS_FIX: 'warning',
  REJECTED: 'error',
};

const ERRORS: Record<string, string> = {
  NOT_ELIGIBLE: 'Hồ sơ chưa đủ thông tin. Bấm “Điền hồ sơ mẫu” trước.',
  NOT_SUBMITTABLE: 'Hồ sơ không ở trạng thái gửi được.',
  NOT_SUBMITTED: 'Hồ sơ không còn chờ duyệt.',
  NOT_REVIEWABLE: 'Hồ sơ không còn chờ duyệt.',
};

/** Reasons sent with the "Yêu cầu bổ sung" / "Từ chối" shortcuts (the Admin section asks for its own). */
const FIX_REASON = 'Ảnh chụp quản lý kênh chưa rõ, vui lòng bổ sung.';
const REJECT_REASON = 'Thông tin hồ sơ không khớp giấy tờ.';

const LABEL: Record<ProfileAction, string> = {
  fill: 'Điền hồ sơ mẫu',
  submit: 'Gửi duyệt',
  approve: 'Duyệt',
  requestFix: 'Yêu cầu bổ sung',
  reject: 'Từ chối',
  useFresh: 'Dùng hồ sơ mới',
};

/**
 * Profile state of the signed-in KOL / MCN: a "Hồ sơ: …" badge and the next-state buttons only. Approve / request
 * more / reject are Admin shortcuts for this account (same review service calls as the Admin section).
 */
export function SampleProfileBlock({ role, onDone }: { role: 'kol' | 'mcn'; onDone(): void }) {
  const { account } = useAuth();
  const { current, busy: switching, switchTo } = useRoleSwitch(onDone);
  const ownerId = account?.id;
  const q = useLiveQuery(() => (ownerId ? profileService.getProfile(ownerId).catch(() => null) : Promise.resolve(null)), [ownerId]);
  const [busy, setBusy] = useState<ProfileAction | null>(null);

  const status = q.data?.profile.status;
  const fresh = ROLE_ACCOUNTS[role].fresh;
  const actions = profileActions(status, current?.key === fresh);
  // Filled in: "Gửi duyệt" becomes the main next step.
  const primary = actions.includes('submit') && q.data?.checklist.every((i) => i.ok) ? 'submit' : actions[0];

  const run = async (a: ProfileAction) => {
    if (a === 'useFresh') return void switchTo(fresh);
    if (!ownerId) return;
    setBusy(a);
    try {
      if (a === 'fill') await demoService.fillSampleProfile(ownerId);
      else if (a === 'submit') await reviewService.submit(ownerId, [true, true, true]);
      else if (a === 'approve') {
        const queue = await reviewService.listAdminQueue();
        const pending = queue.profiles.find((p) => p.ownerId === ownerId)?.pendingChannels ?? [];
        const verdicts: Record<string, ChannelVerdict> = Object.fromEntries(pending.map((c) => [c.id, { verdict: 'PASS' }]));
        await reviewService.approve(ownerId, verdicts);
      } else if (a === 'requestFix') await reviewService.requestFix(ownerId, FIX_REASON);
      else await reviewService.reject(ownerId, REJECT_REASON);
      toast.success(`${LABEL[a]}: xong`);
    } catch (e) {
      const key = e instanceof Error ? e.message : '';
      toast.error(ERRORS[key] ?? (key || 'Không thực hiện được.'));
    } finally {
      setBusy(null);
    }
  };

  const locked = busy !== null || switching !== null;

  return (
    <DemoPanelSection>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-foreground">Hồ sơ:</span>
        {status ? (
          <ToneBadge tone={TONE[status]}>{PROFILE_STATE_LABEL[status]}</ToneBadge>
        ) : q.loading ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {actions.map((a) => (
            <Button
              key={a}
              type="button"
              size="sm"
              variant={a === primary && a !== 'useFresh' ? 'default' : 'outline'}
              className={`h-9 ${a === 'reject' ? 'text-destructive hover:text-destructive' : ''}`}
              disabled={locked}
              onClick={() => void run(a)}
            >
              {(busy === a || (a === 'useFresh' && switching)) && <Loader2 className="animate-spin" aria-hidden />}
              {a === 'useFresh' && !switching && <ArrowRightLeft aria-hidden />}
              {LABEL[a]}
            </Button>
          ))}
        </div>
      )}
      {showsEkyc(role) && status !== 'APPROVED' && <EkycScenarioPicker />}
    </DemoPanelSection>
  );
}
