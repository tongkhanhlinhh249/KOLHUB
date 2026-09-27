import type { FormEvent, ReactNode } from 'react';
import { Field, PASSWORD_HINT, type FieldErrors } from '../form/Field';
import { ConsentField } from './ConsentField';

export interface KolMcnValues {
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  consent: boolean;
}

export const EMPTY_KOL_MCN: KolMcnValues = { phone: '', email: '', password: '', confirmPassword: '', consent: false };

interface Props {
  values: KolMcnValues;
  errors: FieldErrors;
  onChange(v: KolMcnValues): void;
  onSubmit(): void;
  footer: ReactNode;
}

export function KolMcnForm({ values, errors, onChange, onSubmit, footer }: Props) {
  const set = <K extends keyof KolMcnValues>(k: K, v: KolMcnValues[K]) => onChange({ ...values, [k]: v });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Field
        label="Số điện thoại"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="0912 345 678"
        value={values.phone}
        onChange={(e) => set('phone', e.target.value)}
        error={errors.phone}
      />
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="ban@email.com"
        value={values.email}
        onChange={(e) => set('email', e.target.value)}
        error={errors.email}
      />
      <Field
        label="Mật khẩu"
        password
        autoComplete="new-password"
        value={values.password}
        onChange={(e) => set('password', e.target.value)}
        error={errors.password}
        hint={PASSWORD_HINT}
      />
      <Field
        label="Nhập lại mật khẩu"
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
