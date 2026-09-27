import { Outlet, useSearchParams } from 'react-router';
import { AuthShell } from '../features/auth-shell/AuthShell';
import { accountTypeFromQuery } from '../features/auth-shell/accountTypeQuery';

/** Guest frame: split-screen auth shell; `?loai=` drives the brand eyebrow. */
export function GuestLayout() {
  const [params] = useSearchParams();
  return (
    <AuthShell accountType={accountTypeFromQuery(params.get('loai'))}>
      <Outlet />
    </AuthShell>
  );
}
