import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { useAuth } from '../../auth/AuthContext';
import { bizAccountService } from '../../services';
import { Field, splitError } from '../form/Field';
import { OtpStep } from '../otp/OtpStep';

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
}

/** SCR-08 — change the company email; applied only after OTP to the NEW email (BR-45, BR-63). */
export function ChangeEmailDialog({ open, onOpenChange }: Props) {
  const { setAccount } = useAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [input, setInput] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setStep('email');
      setInput('');
      setEmail('');
      setError(null);
      setConfirmError(null);
    }
  }, [open]);

  const start = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setConfirmError(null);
    try {
      const r = await bizAccountService.startCompanyEmailChange(input);
      setEmail(r.email);
      setStep('otp');
    } catch (err) {
      setError(splitError(err, ['email']).message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (otpRequestId: string) => {
    setConfirmError(null);
    try {
      const acc = await bizAccountService.confirmCompanyEmailChange({ newEmail: email, otpRequestId });
      setAccount(acc);
      toast.success(`Đã đổi email công ty thành ${acc.email}`);
      onOpenChange(false);
    } catch (err) {
      setConfirmError(splitError(err, []).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đổi email công ty</DialogTitle>
          <DialogDescription>
            {step === 'email'
              ? 'Email mới chỉ được áp dụng sau khi bạn xác nhận mã gửi tới chính email đó.'
              : `Mã xác thực đã gửi tới ${email}. Email hiện tại vẫn dùng được cho tới khi bạn xác nhận.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'email' ? (
          <form onSubmit={start} noValidate className="grid gap-4">
            <Field
              label="Email công ty mới"
              type="email"
              autoComplete="email"
              placeholder="ten@congty.vn"
              autoFocus
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(null);
              }}
              error={error ?? undefined}
              hint="Dùng email theo tên miền công ty, không dùng Gmail, Yahoo, Outlook, Hotmail, iCloud, Live."
            />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={busy}>
                Huỷ
              </Button>
              <Button type="submit" className="h-11" disabled={busy || !input.trim()}>
                {busy && <Loader2 className="animate-spin" aria-hidden />}
                Tiếp tục
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            {confirmError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" aria-hidden />
                <AlertDescription className="space-y-2">
                  <p>{confirmError}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setStep('email')}>
                    Nhập email khác
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <OtpStep
              channel="email"
              target={email}
              purpose="change-email"
              onVerified={(id) => void confirm(id)}
              onBack={() => {
                setInput(email);
                setStep('email');
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
