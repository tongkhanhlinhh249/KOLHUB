import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AlertCircle, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../auth/AuthContext';
import { roleOf, safeReturnTo } from '../../auth/roles';
import { authService, isValidEmail, isValidPhone, type Account, type AccountType } from '../../services';
import { AccountTypeCards } from '../auth-shell/AccountTypeCards';
import { AuthLegalNote, AuthPageHeader } from '../auth-shell/AuthPageHeader';
import { accountTypeFromQuery, QUERY_BY_TYPE, withAccountType } from '../auth-shell/accountTypeQuery';
import { Field, splitError, type FieldErrors } from '../form/Field';
import { OtpStep } from '../otp/OtpStep';
import { looksLikePhone } from '../auth-shell/identifier';

const REQUIRED = 'Vui lòng nhập thông tin này.';

function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <AlertCircle className="size-4" aria-hidden />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/**
 * SCR-02 — one "Email hoặc số điện thoại" field (BR-07):
 *   email → password sign-in; phone → SMS OTP sign-in (KOL/MCN only).
 * The account-type cards are a UI hint only: the role still comes from the account,
 * and AccessGuard sends the user to their role home after sign-in.
 */
export function LoginPage() {
  const [params, setParams] = useSearchParams();
  const returnTo = params.get('returnTo');
  const type = accountTypeFromQuery(params.get('loai'));
  const isBiz = type === 'BIZ';
  const { setAccount } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpFor, setOtpFor] = useState<string | null>(null);
  const isPhone = looksLikePhone(identifier);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // AccessGuard navigates once the new role is applied; returnTo is validated (BR-69).
  const signedIn = (account: Account) => setAccount(account, safeReturnTo(roleOf(account), returnTo));

  // Service errors point at 'email' or 'phone'; both live in the single identifier field here.
  const showError = (e: unknown) => {
    const { field, message } = splitError(e, ['email', 'phone', 'password']);
    if (field === 'password') setErrors({ password: message });
    else if (field) setErrors({ identifier: message });
    else setFormError(message);
  };

  const reset = () => {
    setErrors({});
    setFormError(null);
  };

  const changeType = (t: AccountType) => {
    reset();
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('loai', QUERY_BY_TYPE[t]);
        return next;
      },
      { replace: true },
    );
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    reset();
    const id = identifier.trim();
    if (!id) return setErrors({ identifier: REQUIRED });

    if (isPhone) {
      // BR-07: phone sign-in is SMS OTP, only for KOL/MCN.
      if (isBiz) return setErrors({ identifier: 'Nhãn hàng/Agency đăng nhập bằng email công ty.' });
      if (!isValidPhone(id)) return setErrors({ identifier: 'Số điện thoại không hợp lệ (ví dụ: 0912345678).' });
      setSubmitting(true);
      try {
        await authService.checkPhoneLogin(id);
        setOtpFor(id);
      } catch (err) {
        showError(err);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const errs: FieldErrors = {};
    if (!isValidEmail(id)) errs.identifier = isBiz ? 'Email công ty không hợp lệ.' : 'Email hoặc số điện thoại không hợp lệ.';
    if (!password) errs.password = REQUIRED;
    if (Object.keys(errs).length) return setErrors(errs);

    setSubmitting(true);
    try {
      signedIn(await authService.loginWithEmail(id, password));
    } catch (err) {
      showError(err);
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  const onPhoneVerified = async (requestId: string) => {
    if (!otpFor) return;
    try {
      signedIn(await authService.loginWithPhone(otpFor, requestId));
    } catch (err) {
      setOtpFor(null);
      showError(err);
    }
  };

  if (otpFor) {
    return (
      <OtpStep channel="sms" target={otpFor} purpose="login" onVerified={onPhoneVerified} onBack={() => setOtpFor(null)} />
    );
  }

  return (
    <div className="space-y-6">
      <AuthPageHeader title="Chào mừng trở lại" subtitle="Chọn loại tài khoản để đăng nhập." />
      <AccountTypeCards value={type} onChange={changeType} label="Loại tài khoản đăng nhập" />

      {returnTo?.startsWith('/') && !returnTo.startsWith('//') && (
        <Alert>
          <Info className="size-4" aria-hidden />
          <AlertDescription>Vui lòng đăng nhập để tiếp tục.</AlertDescription>
        </Alert>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        <Field
          label={isBiz ? 'Email công ty' : 'Email hoặc số điện thoại'}
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={isBiz ? 'ban@congty.vn' : 'ban@email.com hoặc 0912 345 678'}
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: undefined }));
          }}
          error={errors.identifier}
          hint={!isBiz && isPhone ? 'Chúng tôi sẽ gửi mã OTP qua SMS tới số này.' : undefined}
        />

        {!isPhone && (
          <div className="space-y-1">
            <Field
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              password
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            <div className="flex justify-end">
              <Link
                to={withAccountType('/quen-mat-khau', type)}
                className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline md:min-h-8"
              >
                Quên mật khẩu?
              </Link>
            </div>
          </div>
        )}

        <FormAlert message={formError} />
        <Button type="submit" className="h-11 w-full" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {isPhone && !isBiz ? 'Nhận mã OTP' : 'Đăng nhập'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Link
          to={withAccountType('/dang-ky', type)}
          className="inline-flex min-h-11 items-center font-medium text-primary hover:underline md:min-h-0"
        >
          Đăng ký
        </Link>
      </p>
      <AuthLegalNote />
    </div>
  );
}
