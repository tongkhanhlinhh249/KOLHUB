import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AccessGuard } from './auth/AccessGuard';
import { GuestLayout } from './layouts/GuestLayout';
import { ComingSoon } from './features/placeholder/ComingSoon';
import { RegisterPage } from './features/register/RegisterPage';
import { LoginPage } from './features/login/LoginPage';
import { ForgotPasswordPage } from './features/login/ForgotPasswordPage';
// --- phase 3 ---
import { SearchPage } from './features/biz-search/SearchPage';
import { SavedListsPage } from './features/saved-lists/SavedListsPage';

const PHASE_2 = 'Màn hình này sẽ có ở Đợt 2 của bản demo.';
const PHASE_3 = 'Màn hình này sẽ có ở Đợt 3 của bản demo.';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AccessGuard />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        element: <GuestLayout />,
        children: [
          { path: 'dang-ky', element: <RegisterPage /> },
          { path: 'dang-nhap', element: <LoginPage /> },
          { path: 'quen-mat-khau', element: <ForgotPasswordPage /> },
        ],
      },
      {
        element: <Layout />,
        children: [
          { path: 'ho-so-kol', element: <ComingSoon title="Hồ sơ KOL" note={PHASE_2} /> },
          { path: 'ho-so-mcn', element: <ComingSoon title="Hồ sơ MCN" note={PHASE_2} /> },
          { path: 'kol-safety', element: <ComingSoon title="KOL Safety" note="Tính năng sắp ra mắt." /> },
          { path: 'tim-kiem-kol', element: <SearchPage /> },
          { path: 'danh-sach-da-luu', element: <SavedListsPage /> },
          { path: 'tai-khoan-doanh-nghiep', element: <ComingSoon title="Tài khoản doanh nghiệp" note={PHASE_3} /> },
        ],
      },
      { index: true, element: <Navigate to="/" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
