import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertCircle, ArrowLeft, Loader2, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { cn } from '../../components/ui/utils';
import { authService, errorMessage, isStrongPassword, isValidEmail, isValidPhone, KolhubError, type OtpChannel } from '../../services';
import { Field, PASSWORD_HINT, splitError, type FieldErrors } from '../form/Field';
import { OtpStep } from '../otp/OtpStep';

type Step = 'target' | 'otp' | 'password';
const REQUIRED = 'Vui lòng nhập thông tin này.';

const CHANNELS: { value: OtpChannel; icon: typeof Mail; label: string }[] = [
  { value: 'email', icon: Mail, label: 'Qua email' },
  { value: 'sms', icon: MessageSquare, label: 'Qua SMS' },
];

/** SCR-02 — password recovery by email or SMS OTP (BR-09, BR-10). */
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('target');
  const [channel, setChannel] = useState<OtpChannel>('email');
  const [target, setTarget] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitTarget = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const value = target.trim();
    if (!value) return setErrors({ target: REQUIRED });
    if (channel === 'email' && !isValidEmail(value)) return setErrors({ target: 'Email không hợp lệ.' });
    if (channel === 'sms' && !isValidPhone(value))
      return setErrors({ target: 'Số điện thoại không hợp lệ (ví dụ: 0912345678).' });
    setErrors({});
    setStep('otp');
  };

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!isStrongPassword(password)) return setErrors({ password: errorMessage('KOLHUB-4003') });
    if (password !== confirmPassword) return setErrors({ confirmPassword: errorMessage('KOLHUB-4004') });
    setErrors({});
    if (!requestId) return;

    setSubmitting(true);
    try {
      await authService.resetPassword({ channel, target, otpRequestId: requestId, password, confirmPassword });
      toast.success('Đã đổi mật khẩu. Vui lòng đăng nhập lại.');
      navigate('/dang-nhap', { replace: true });
    } catch (err) {
      // Unknown email/phone (4012) or a used/expired code (4014): the OTP cannot be reused, restart from the target step.
      if (err instanceof KolhubError && (err.code === 'KOLHUB-4012' || err.code === 'KOLHUB-4014')) {
        setRequestId(null);
        setStep('target');
        setErrors({ target: err.message });
        return;
      }
      const { field, message } = splitError(err, ['password', 'confirmPassword']);
      if (field) setErrors({ [field]: message });
      else setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'otp') {
    return (
      <OtpStep
        channel={channel}
        target={target}
        purpose="reset"
        onVerified={(id) => {
          setRequestId(id);
          setStep('password');
        }}
        onBack={() => setStep('target')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold text-foreground">
          {step === 'password' ? 'Đặt mật khẩu mới' : 'Quên mật khẩu'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {step === 'password'
            ? 'Mã xác thực hợp lệ. Hãy tạo mật khẩu mới cho tài khoản.'
            : 'Chọn cách nhận mã xác thực để đặt lại mật khẩu'}
        </p>
      </div>

      {step === 'target' ? (
        <form onSubmit={submitTarget} noValidate className="space-y-4">
          <RadioGroup
            value={channel}
            onValueChange={(v) => {
              setChannel(v as OtpChannel);
              setTarget('');
              setErrors({});
            }}
            aria-label="Cách nhận mã"
            className="grid grid-cols-2 gap-3"
          >
            {CHANNELS.map((c) => {
              const selected = channel === c.value;
              const id = `reset-channel-${c.value}`;
              return (
                <Label
                  key={c.value}
                  htmlFor={id}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 font-normal transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                    selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
                  )}
                >
                  <RadioGroupItem value={c.value} id={id} aria-label={c.label} />
                  <c.icon className={cn('size-4', selected ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
                  <span className="text-sm font-medium text-foreground">{c.label}</span>
                </Label>
              );
            })}
          </RadioGroup>

          {channel === 'email' ? (
            <Field
              key="email"
              label="Email đã đăng ký"
              type="email"
              autoComplete="email"
              placeholder="ban@email.com"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              error={errors.target}
            />
          ) : (
            <Field
              key="sms"
              label="Số điện thoại đã đăng ký"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0912 345 678"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              error={errors.target}
            />
          )}
          <Button type="submit" className="h-11 w-full">
            Gửi mã xác thực
          </Button>
        </form>
      ) : (
        <form onSubmit={submitPassword} noValidate className="space-y-4">
          <Field
            label="Mật khẩu mới"
            password
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            hint={PASSWORD_HINT}
          />
          <Field
            label="Nhập lại mật khẩu mới"
            password
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
          />
          {formError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" aria-hidden />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="h-11 w-full" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" aria-hidden />}
            Đổi mật khẩu
          </Button>
        </form>
      )}

      <div className="flex justify-center">
        <Button asChild variant="ghost" className="h-11">
          <Link to="/dang-nhap">
            <ArrowLeft aria-hidden />
            Quay lại đăng nhập
          </Link>
        </Button>
      </div>
    </div>
  );
}
