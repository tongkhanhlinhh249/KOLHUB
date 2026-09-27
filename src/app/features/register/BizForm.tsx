import type { FormEvent, ReactNode } from 'react';
import { Field, PASSWORD_HINT, type FieldErrors } from '../form/Field';
import { ConsentField } from './ConsentField';

export interface BizValues {
  fullName: string;
  company: string;
  email: string;
  password: string;
  confirmPassword: string;
  consent: boolean;
}

export const EMPTY_BIZ: BizValues = { fullName: '', company: '', email: '', password: '', confirmPassword: '', consent: false };

interface Props {
  values: BizValues;
  errors: FieldErrors;
  onChange(v: BizValues): void;
  onSubmit(): void;
  footer: ReactNode;
}

export function BizForm({ values, errors, onChange, onSubmit, footer }: Props) {
  const set = <K extends keyof BizValues>(k: K, v: BizValues[K]) => onChange({ ...values, [k]: v });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field
        label="Họ và tên"
        placeholder="Nguyễn Văn An"
        autoComplete="name"
        value={values.fullName}
        onChange={(e) => set('fullName', e.target.value)}
        error={errors.fullName}
      />
      <Field
        label="Tên công ty"
        placeholder="Công ty TNHH ABC"
        autoComplete="organization"
        value={values.company}
        onChange={(e) => set('company', e.target.value)}
        error={errors.company}
      />
      <Field
        label="Email công ty"
        type="email"
        autoComplete="email"
        placeholder="ten@congty.vn"
        value={values.email}
        onChange={(e) => set('email', e.target.value)}
        error={errors.email}
        hint="Không dùng Gmail, Yahoo, Outlook… Hãy dùng email theo tên miền công ty."
      />
      <Field
        label="Mật khẩu"
        placeholder="Tối thiểu 8 ký tự, có chữ và số"
        password
        autoComplete="new-password"
        value={values.password}
        onChange={(e) => set('password', e.target.value)}
        error={errors.password}
        hint={PASSWORD_HINT}
      />
      <Field
        label="Nhập lại mật khẩu"
        placeholder="Nhập lại mật khẩu"
        password
        autoComplete="new-password"
        value={values.confirmPassword}
        onChange={(e) => set('confirmPassword', e.target.value)}
        error={errors.confirmPassword}
      />
      <ConsentField checked={values.consent} onChange={(v) => set('consent', v)} error={errors.consent} />
      {footer}
    </form>
  );
}
