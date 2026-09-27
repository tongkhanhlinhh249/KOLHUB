import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AccessGuard } from './auth/AccessGuard';
import { GuestLayout } from './layouts/GuestLayout';
import { ComingSoon } from './features/placeholder/ComingSoon';

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
          { path: 'dang-ky', element: <ComingSoon title="Đăng ký" note="Đang xây dựng." /> },
          { path: 'dang-nhap', element: <ComingSoon title="Đăng nhập" note="Đang xây dựng." /> },
          { path: 'quen-mat-khau', element: <ComingSoon title="Quên mật khẩu" note="Đang xây dựng." /> },
        ],
      },
      {
        element: <Layout />,
        children: [
          { path: 'ho-so-kol', element: <ComingSoon title="Hồ sơ KOL" note={PHASE_2} /> },
          { path: 'ho-so-mcn', element: <ComingSoon title="Hồ sơ MCN" note={PHASE_2} /> },
          { path: 'kol-safety', element: <ComingSoon title="KOL Safety" note="Tính năng sắp ra mắt." /> },
          { path: 'tim-kiem-kol', element: <ComingSoon title="Tìm kiếm KOL" note={PHASE_3} /> },
          { path: 'danh-sach-da-luu', element: <ComingSoon title="Danh sách đã lưu" note={PHASE_3} /> },
          { path: 'tai-khoan-doanh-nghiep', element: <ComingSoon title="Tài khoản doanh nghiệp" note={PHASE_3} /> },
        ],
      },
      { index: true, element: <Navigate to="/" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
