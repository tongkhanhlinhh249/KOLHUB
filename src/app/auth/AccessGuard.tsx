import { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { GUEST_PATHS, ROLE_CONFIG, resolveAccess, safeReturnTo } from './roles';
import type { RoleKey } from '../services';

function isGuestPage(pathname: string): boolean {
  return GUEST_PATHS.includes(pathname.replace(/\/+$/, '') || '/');
}

/** Where to go right after the role changed (login, register, logout, demo switch). */
function afterRoleChange(role: RoleKey, requested: string | null, pathname: string, search: string): string {
  if (requested && resolveAccess(role, requested).allow) return requested;
  if (role === 'kolhub.guest') return '/dang-nhap';
  if (isGuestPage(pathname)) return safeReturnTo(role, new URLSearchParams(search).get('returnTo'));
  return ROLE_CONFIG[role].home;
}

/** Root route element: applies resolveAccess (BR-66..69) to every path. */
export function AccessGuard() {
  const { role, pendingRedirect, clearPendingRedirect } = useAuth();
  const { pathname, search } = useLocation();
  const prevRole = useRef(role);
  const roleChanged = prevRole.current !== role;
  const access = resolveAccess(role, pathname + search);
  // Only warn when the user navigates to a page of another role, not when the role itself just changed.
  const forbidden = !roleChanged && !access.allow && access.reason === 'forbidden';

  useEffect(() => {
    if (prevRole.current !== role) {
      prevRole.current = role;
      clearPendingRedirect();
    }
  });

  useEffect(() => {
    if (forbidden) toast.error('Bạn không có quyền truy cập trang này', { id: 'access-forbidden' });
  }, [forbidden, pathname]);

  if (roleChanged) {
    const to = afterRoleChange(role, pendingRedirect(), pathname, search);
    if (to !== pathname + search) return <Navigate to={to} replace />;
  }

  if (!access.allow) {
    // Signed in on a guest page: honour a safe ?returnTo (BR-69).
    const to =
      role !== 'kolhub.guest' && isGuestPage(pathname)
        ? safeReturnTo(role, new URLSearchParams(search).get('returnTo'))
        : access.redirect;
    return <Navigate to={to} replace />;
  }
  return <Outlet />;
}
