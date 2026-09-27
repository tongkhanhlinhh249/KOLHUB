import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { resolveAccess } from './roles';

/** Root route element: applies resolveAccess (BR-66..69) to every path. */
export function AccessGuard() {
  const { role } = useAuth();
  const { pathname, search } = useLocation();
  const access = resolveAccess(role, pathname + search);
  const forbidden = !access.allow && access.reason === 'forbidden';

  useEffect(() => {
    if (forbidden) toast.error('Bạn không có quyền truy cập trang này', { id: 'access-forbidden' });
  }, [forbidden, pathname]);

  if (!access.allow) return <Navigate to={access.redirect} replace />;
  return <Outlet />;
}
