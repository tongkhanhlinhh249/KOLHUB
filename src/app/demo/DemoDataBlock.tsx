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
import { DEMO_PASSWORD, db } from '../services';
import { DemoPanelSection } from './DemoPanelSection';

const SAMPLE_ACCOUNTS = [
  { label: 'Cá nhân/KOL', email: 'kol@demo.kolhub.vn' },
  { label: 'Tổ chức/MCN', email: 'mcn@demo.kolhub.vn' },
  { label: 'Nhãn hàng/Agency', email: 'brand@vinamilk-demo.vn' },
];

/** Reset the demo store to its seed data, plus the sample account cheat sheet. */
export function DemoDataBlock({ onDone }: { onDone?: () => void }) {
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const reset = async () => {
    setBusy(true);
    try {
      db.reset();
      // Signed in: the guard redirects after sign-out. Already a guest: no role change, navigate directly.
      if (role === 'kolhub.guest') navigate('/dang-ky', { replace: true });
      else await logout('/dang-ky');
      toast.success('Đã khôi phục dữ liệu demo ban đầu.');
      onDone?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <DemoPanelSection title="Dữ liệu" description="Dữ liệu demo lưu trên trình duyệt này.">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" className="h-11 w-full" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
            Reset dữ liệu demo
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset dữ liệu demo?</AlertDialogTitle>
            <AlertDialogDescription>
              Mọi tài khoản đã đăng ký và mã OTP sẽ bị xoá, chỉ giữ lại tài khoản mẫu. Bạn sẽ được đăng xuất.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={reset}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-1 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
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
