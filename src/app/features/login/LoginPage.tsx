import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AlertCircle, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useAuth } from '../../auth/AuthContext';
import { roleOf, safeReturnTo } from '../../auth/roles';
import { authService, isValidEmail, isValidPhone, type Account, type AccountType } from '../../services';
import { AccountTypeCards } from '../auth-shell/AccountTypeCards';
import { AuthLegalNote, AuthPageHeader } from '../auth-shell/AuthPageHeader';
import { accountTypeFromQuery, QUERY_BY_TYPE, withAccountType } from '../auth-shell/accountTypeQuery';
import { Field, splitError, type FieldErrors } from '../form/Field';
import { OtpStep } from '../otp/OtpStep';

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
 * SCR-02 — sign in with email + password, or phone + SMS OTP for KOL/MCN (BR-06..08).
 * The account-type cards are a UI hint only: the role still comes from the account,
 * and AccessGuard sends the user to their role home after sign-in.
 */
export function LoginPage() {
  const [params, setParams] = useSearchParams();
  const returnTo = params.get('returnTo');
  const type = accountTypeFromQuery(params.get('loai'));
  const isBiz = type === 'BIZ';
  const { setAccount } = useAuth();
  const [tabState, setTab] = useState<'email' | 'phone'>('email');
  // BR-07: phone OTP sign-in is only offered to KOL/MCN.
  const tab = isBiz ? 'email' : tabState;

  // Email tab
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Phone tab
  const [phone, setPhone] = useState('');
  const [phoneStep, setPhoneStep] = useState<'phone' | 'otp'>('phone');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // AccessGuard navigates once the new role is applied; returnTo is validated (BR-69).
  const signedIn = (account: Account) => setAccount(account, safeReturnTo(roleOf(account), returnTo));

  const showError = (e: unknown, fields: string[]) => {
    const { field, message } = splitError(e, fields);
    if (field) setErrors({ [field]: message });
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

  const submitEmail = async (e: FormEvent) => {
    e.preventDefault();
    reset();
    const errs: FieldErrors = {};
    if (!email.trim()) errs.email = REQUIRED;
    else if (!isValidEmail(email)) errs.email = 'Email không hợp lệ.';
    if (!password) errs.password = REQUIRED;
    if (Object.keys(errs).length) return setErrors(errs);

    setSubmitting(true);
    try {
      signedIn(await authService.loginWithEmail(email, password));
    } catch (err) {
      showError(err, ['email', 'password']);
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  const submitPhone = async (e: FormEvent) => {
    e.preventDefault();
    reset();
    if (!phone.trim()) return setErrors({ phone: REQUIRED });
    if (!isValidPhone(phone))
      return setErrors({
        phone: 'Số điện thoại không hợp lệ (ví dụ: 0912345678).',
      });

    setSubmitting(true);
    try {
      await authService.checkPhoneLogin(phone);
      setPhoneStep('otp');
    } catch (err) {
      showError(err, ['phone']);
    } finally {
      setSubmitting(false);
    }
  };

  const onPhoneVerified = async (requestId: string) => {
    try {
      signedIn(await authService.loginWithPhone(phone, requestId));
    } catch (err) {
      setPhoneStep('phone');
      showError(err, ['phone']);
    }
  };

  if (tab === 'phone' && phoneStep === 'otp') {
    return (
      <OtpStep
        channel="sms"
        target={phone}
        purpose="login"
        onVerified={onPhoneVerified}
        onBack={() => setPhoneStep('phone')}
      />
    );
  }

  const emailForm = (
    <form onSubmit={submitEmail} noValidate className="space-y-4">
      <Field
        label={isBiz ? 'Email công ty' : 'Email'}
        type="email"
        autoComplete="email"
        placeholder={isBiz ? 'ban@congty.vn' : 'ban@email.com'}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <div className="space-y-1">
        <Field
          label="Mật khẩu"
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
      <FormAlert message={formError} />
      <Button type="submit" className="h-11 w-full" disabled={submitting}>
        {submitting && <Loader2 className="animate-spin" aria-hidden />}
        Đăng nhập
      </Button>
    </form>
  );

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

      {isBiz ? (
        emailForm
      ) : (
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as 'email' | 'phone');
            reset();
          }}
        >
          <TabsList className="grid h-11 w-full grid-cols-2">
            <TabsTrigger value="email" className="h-full">
              Email
            </TabsTrigger>
            <TabsTrigger value="phone" className="h-full whitespace-normal text-xs leading-tight sm:text-sm">
              Số điện thoại (OTP SMS)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-5">
            {emailForm}
          </TabsContent>

          <TabsContent value="phone" className="mt-5">
            <form onSubmit={submitPhone} noValidate className="space-y-4">
              <Field
                label="Số điện thoại"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0912 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={errors.phone}
                hint="Dành cho tài khoản Cá nhân/KOL và Tổ chức/MCN."
              />
              <FormAlert message={formError} />
              <Button type="submit" className="h-11 w-full" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" aria-hidden />}
                Nhận mã OTP
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      )}

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
