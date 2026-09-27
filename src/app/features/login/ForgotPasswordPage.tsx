import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { authService, errorMessage, isStrongPassword, isValidEmail, isValidPhone, KolhubError, type OtpChannel } from '../../services';
import { AuthPageHeader } from '../auth-shell/AuthPageHeader';
import { accountTypeFromQuery, withAccountType } from '../auth-shell/accountTypeQuery';
import { Field, PASSWORD_HINT, splitError, type FieldErrors } from '../form/Field';
import { OtpStep } from '../otp/OtpStep';
import { looksLikePhone } from '../auth-shell/identifier';

type Step = 'target' | 'otp' | 'password';
const REQUIRED = 'Vui lòng nhập thông tin này.';

/** SCR-02 — password recovery: one "Email hoặc số điện thoại" field; the OTP goes by email or SMS accordingly (BR-10). */
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const loginPath = withAccountType('/dang-nhap', accountTypeFromQuery(params.get('loai')));
  const [step, setStep] = useState<Step>('target');
  const [target, setTarget] = useState('');
  // Channel follows what was typed: phone → SMS, otherwise email.
  const channel: OtpChannel = looksLikePhone(target) ? 'sms' : 'email';
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
    if (channel === 'sms' && !isValidPhone(value))
      return setErrors({ target: 'Số điện thoại không hợp lệ (ví dụ: 0912345678).' });
    if (channel === 'email' && !isValidEmail(value)) return setErrors({ target: 'Email hoặc số điện thoại không hợp lệ.' });
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
      navigate(loginPath, { replace: true });
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
      <AuthPageHeader
        title={step === 'password' ? 'Đặt mật khẩu mới' : 'Quên mật khẩu'}
        subtitle={
          step === 'password'
            ? 'Mã xác thực hợp lệ. Hãy tạo mật khẩu mới cho tài khoản.'
            : 'Nhập email hoặc số điện thoại đã đăng ký để nhận mã xác thực.'
        }
      />

      {step === 'target' ? (
        <form onSubmit={submitTarget} noValidate className="space-y-4">
          <Field
            label="Email hoặc số điện thoại"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="ban@email.com hoặc 0912 345 678"
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              if (errors.target) setErrors({});
            }}
            error={errors.target}
            hint={
              target.trim()
                ? channel === 'sms'
                  ? 'Mã xác thực sẽ được gửi qua SMS.'
                  : 'Mã xác thực sẽ được gửi qua email.'
                : undefined
            }
          />
          <Button type="submit" className="h-11 w-full">
            Gửi mã xác thực
          </Button>
        </form>
      ) : (
        <form onSubmit={submitPassword} noValidate className="space-y-4">
          <Field
            label="Mật khẩu mới"
            placeholder="Tối thiểu 8 ký tự, có chữ và số"
            password
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            hint={PASSWORD_HINT}
          />
          <Field
            label="Nhập lại mật khẩu mới"
            placeholder="Nhập lại mật khẩu mới"
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
          <Link to={loginPath}>
            <ArrowLeft aria-hidden />
            Quay lại đăng nhập
          </Link>
        </Button>
      </div>
    </div>
  );
}
