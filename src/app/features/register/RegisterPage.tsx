import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_CONFIG, roleOf } from '../../auth/roles';
import {
  authService,
  errorMessage,
  funnelService,
  isFreeEmail,
  isStrongPassword,
  isValidEmail,
  isValidPhone,
  type AccountType,
} from '../../services';
import { splitError, type FieldErrors } from '../form/Field';
import { OtpStep } from '../otp/OtpStep';
import { AccountTypeCards } from '../auth-shell/AccountTypeCards';
import { AuthPageHeader } from '../auth-shell/AuthPageHeader';
import { accountTypeFromQuery, QUERY_BY_TYPE, withAccountType } from '../auth-shell/accountTypeQuery';
import { BizForm, EMPTY_BIZ, type BizValues } from './BizForm';
import { EMPTY_KOL_MCN, KolMcnForm, type KolMcnValues } from './KolMcnForm';

type Step = 'form' | 'otp-email' | 'otp-sms';

const FIELDS = ['phone', 'email', 'password', 'confirmPassword', 'consent', 'fullName', 'company'];
const REQUIRED = 'Vui lòng nhập thông tin này.';

function validatePasswords(v: { password: string; confirmPassword: string }, errors: FieldErrors) {
  if (!isStrongPassword(v.password)) errors.password = errorMessage('KOLHUB-4003');
  else if (v.password !== v.confirmPassword) errors.confirmPassword = errorMessage('KOLHUB-4004');
}

function validateKolMcn(v: KolMcnValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!v.phone.trim()) errors.phone = REQUIRED;
  else if (!isValidPhone(v.phone)) errors.phone = 'Số điện thoại không hợp lệ (ví dụ: 0912345678).';
  if (!v.email.trim()) errors.email = REQUIRED;
  else if (!isValidEmail(v.email)) errors.email = 'Email không hợp lệ.';
  validatePasswords(v, errors);
  if (!v.consent) errors.consent = 'Vui lòng đồng ý với điều khoản sử dụng.';
  return errors;
}

function validateBiz(v: BizValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!v.fullName.trim()) errors.fullName = REQUIRED;
  if (!v.company.trim()) errors.company = REQUIRED;
  if (!v.email.trim()) errors.email = REQUIRED;
  else if (!isValidEmail(v.email)) errors.email = 'Email không hợp lệ.';
  else if (isFreeEmail(v.email)) errors.email = errorMessage('KOLHUB-4015');
  validatePasswords(v, errors);
  if (!v.consent) errors.consent = 'Vui lòng đồng ý với điều khoản sử dụng.';
  return errors;
}

/** SCR-01 — register as KOL, MCN or Brand/Agency, then verify OTP (BR-02..05, BR-45). */
export function RegisterPage() {
  const [params, setParams] = useSearchParams();
  const { setAccount } = useAuth();
  const type: AccountType = accountTypeFromQuery(params.get('loai'));

  const [step, setStep] = useState<Step>('form');
  const [kolMcn, setKolMcn] = useState<KolMcnValues>(EMPTY_KOL_MCN);
  const [biz, setBiz] = useState<BizValues>(EMPTY_BIZ);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [emailRequestId, setEmailRequestId] = useState<string | null>(null);

  const isBiz = type === 'BIZ';
  const email = isBiz ? biz.email : kolMcn.email;
  const consent = isBiz ? biz.consent : kolMcn.consent;

  const changeType = (t: AccountType) => {
    setErrors({});
    setFormError(null);
    setParams({ loai: QUERY_BY_TYPE[t] }, { replace: true });
  };

  const submit = async () => {
    const clientErrors = isBiz ? validateBiz(biz) : validateKolMcn(kolMcn);
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length) return;

    setSubmitting(true);
    try {
      const { registrationId } = await authService.startRegistration(
        isBiz ? { type: 'BIZ', ...biz } : { type: type as 'KOL' | 'MCN', ...kolMcn },
      );
      setRegistrationId(registrationId);
      funnelService.track(email, 'register_started');
      setStep('otp-email');
    } catch (e) {
      const { field, message } = splitError(e, FIELDS);
      if (field) setErrors({ [field]: message });
      else setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const complete = async (emailOtpRequestId: string, smsOtpRequestId?: string) => {
    if (!registrationId) return;
    try {
      const account = await authService.completeRegistration({ registrationId, emailOtpRequestId, smsOtpRequestId });
      // AccessGuard performs the navigation once the new role is applied.
      setAccount(account, ROLE_CONFIG[roleOf(account)].home);
    } catch (e) {
      const { field, message } = splitError(e, FIELDS);
      setStep('form');
      if (field) setErrors({ [field]: message });
      else setFormError(message);
    }
  };

  const onEmailVerified = (requestId: string) => {
    setEmailRequestId(requestId);
    funnelService.track(email, 'otp_email_verified');
    if (isBiz) void complete(requestId);
    else setStep('otp-sms');
  };

  const backToForm = () => setStep('form');

  if (step === 'otp-email') {
    return <OtpStep key="email" channel="email" target={email} purpose="register" onVerified={onEmailVerified} onBack={backToForm} />;
  }
  if (step === 'otp-sms' && emailRequestId) {
    return (
      <OtpStep
        key="sms"
        channel="sms"
        target={kolMcn.phone}
        purpose="register"
        onVerified={(smsId) => {
          funnelService.track(email, 'otp_sms_verified');
          void complete(emailRequestId, smsId);
        }}
        onBack={backToForm}
      />
    );
  }

  const footer = (
    <div className="space-y-4 pt-2">
      {formError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" aria-hidden />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="h-11 w-full" disabled={!consent || submitting}>
        {submitting && <Loader2 className="animate-spin" aria-hidden />}
        Đăng ký
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link to={withAccountType('/dang-nhap', type)} className="inline-flex min-h-11 items-center font-medium text-primary hover:underline md:min-h-0">
          Đăng nhập
        </Link>
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      <AuthPageHeader title="Tạo tài khoản KOLHUB" subtitle="Chọn loại tài khoản phù hợp với bạn." />
      <AccountTypeCards value={type} onChange={changeType} label="Loại tài khoản đăng ký" />
      {isBiz ? (
        <BizForm values={biz} errors={errors} onChange={setBiz} onSubmit={submit} footer={footer} />
      ) : (
        <KolMcnForm values={kolMcn} errors={errors} onChange={setKolMcn} onSubmit={submit} footer={footer} />
      )}
    </div>
  );
}
