import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';
import { useAuth } from '../auth/AuthContext';
import { DEMO_PASSWORD, db, demoCampaignService } from '../services';
import { DemoPanelSection } from './DemoPanelSection';

const SAMPLE_ACCOUNTS = [
  { label: 'Cá nhân/KOL', email: 'kol@demo.kolhub.vn' },
  { label: 'Tổ chức/MCN', email: 'mcn@demo.kolhub.vn' },
  { label: 'Nhãn hàng/Agency', email: 'brand@vinamilk-demo.vn' },
];

function ConfirmButton({
  label,
  title,
  description,
  confirm,
  busy,
  disabled,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  confirm: string;
  busy: boolean;
  disabled: boolean;
  onConfirm(): void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11 w-full justify-start md:h-9" disabled={disabled}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirm}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Restore the sample campaigns or the whole demo store to its seed data, plus the sample account cheat sheet. */
export function DemoDataBlock({ onDone }: { onDone?: () => void }) {
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<'all' | 'campaigns' | null>(null);

  const resetCampaigns = async () => {
    setBusy('campaigns');
    try {
      await demoCampaignService.resetCampaigns();
      toast.success('Đã khôi phục chiến dịch mẫu.');
    } finally {
      setBusy(null);
    }
  };

  const reset = async () => {
    setBusy('all');
    try {
      db.reset();
      // Signed in: the guard redirects after sign-out. Already a guest: no role change, navigate directly.
      if (role === 'kolhub.guest') navigate('/dang-ky', { replace: true });
      else await logout('/dang-ky');
      toast.success('Đã khôi phục dữ liệu demo ban đầu.');
      onDone?.();
    } finally {
      setBusy(null);
    }
  };

  return (
    <DemoPanelSection title="Dữ liệu demo" description="Lưu trên trình duyệt này.">
      <ConfirmButton
        label="Khôi phục chiến dịch mẫu"
        title="Khôi phục chiến dịch mẫu?"
        description="Mọi chiến dịch, booking và chiến dịch đã lưu trở về dữ liệu mẫu ban đầu. Tài khoản, hồ sơ và phiên đăng nhập được giữ nguyên."
        confirm="Khôi phục"
        busy={busy === 'campaigns'}
        disabled={busy !== null}
        onConfirm={() => void resetCampaigns()}
      />
      <ConfirmButton
        label="Reset toàn bộ dữ liệu demo"
        title="Reset dữ liệu demo?"
        description="Mọi tài khoản đã đăng ký và mã OTP sẽ bị xoá, chỉ giữ lại tài khoản mẫu. Bạn sẽ được đăng xuất."
        confirm="Reset"
        busy={busy === 'all'}
        disabled={busy !== null}
        onConfirm={() => void reset()}
      />

      <div className="space-y-1 rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Tài khoản mẫu</p>
        <ul className="space-y-0.5">
          {SAMPLE_ACCOUNTS.map((a) => (
            <li key={a.email}>
              {a.label}: <span className="break-all text-foreground">{a.email}</span>
            </li>
          ))}
        </ul>
        <p>
          Mật khẩu chung: <span className="font-mono text-foreground">{DEMO_PASSWORD}</span>
        </p>
      </div>
    </DemoPanelSection>
  );
}
