import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { useAuth } from '../../auth/AuthContext';
import { useIdentity } from '../../auth/useIdentity';
import { InfoRow, SectionCard } from '../profile/ProfileSection';
import { ProfileAvatar } from '../profile/ProfileAvatar';
import { EmailVerifiedBadge } from '../shared/StatusBadges';
import { ChangeEmailDialog } from './ChangeEmailDialog';
import { EditBizProfileDialog } from './EditBizProfileDialog';
import { PlanSection } from './PlanSection';

/** Account header, laid out like the KOL/MCN ProfileHeader (without cover): same name + initials as the topbar. */
function BizAccountHeader() {
  const identity = useIdentity();
  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar name={identity.name} src={identity.avatar} className="shrink-0 border-0" />
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-lg font-semibold text-foreground">{identity.name}</h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {identity.subtitle && <span className="min-w-0 break-words font-medium text-foreground">{identity.subtitle}</span>}
              {identity.subtitle && <span aria-hidden>·</span>}
              <span>{identity.roleLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <EmailVerifiedBadge />
        </div>
      </div>
    </Card>
  );
}

/** SCR-08 — Brand/Agency account: header card + section cards, same pattern and width as the KOL/MCN profile. */
export function BizAccountPage() {
  const { account } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      <BizAccountHeader />

      <SectionCard title="Thông tin doanh nghiệp" onEdit={() => setEditOpen(true)}>
        <InfoRow label="Họ tên" value={account?.fullName ?? ''} />
        <InfoRow label="Tên công ty" value={account?.company ?? ''} />
      </SectionCard>

      <SectionCard
        title="Email đăng nhập"
        action={
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => setEmailOpen(true)}>
            Đổi email
          </Button>
        }
      >
        <div className="space-y-0.5 md:col-span-2">
          <dt className="text-xs text-muted-foreground">Email</dt>
          <dd className="space-y-0.5">
            <span className="block break-all text-sm text-foreground">{account?.email}</span>
            <span className="block text-xs text-muted-foreground">Dùng để đăng nhập và nhận thông báo.</span>
          </dd>
        </div>
      </SectionCard>

      <PlanSection />

      <EditBizProfileDialog open={editOpen} onOpenChange={setEditOpen} />
      <ChangeEmailDialog open={emailOpen} onOpenChange={setEmailOpen} />
    </div>
  );
}
