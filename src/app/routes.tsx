import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AccessGuard } from './auth/AccessGuard';
import { GuestLayout } from './layouts/GuestLayout';
import { RegisterPage } from './features/register/RegisterPage';
import { LoginPage } from './features/login/LoginPage';
import { ForgotPasswordPage } from './features/login/ForgotPasswordPage';
// --- phase 3 ---
import { SearchPage } from './features/biz-search/SearchPage';
import { SavedListsPage } from './features/saved-lists/SavedListsPage';
import { BizAccountPage } from './features/biz-account/BizAccountPage';
// --- phase 2 ---
import { ProfileIndexRedirect, ProfilePage } from './features/profile/ProfilePage';
import { PROFILE_SECTIONS } from './features/profile/primaryAction';
import type { OwnerType } from './services';
// --- KOL Safety ---
import { VideoCheckPage } from './features/safety/VideoCheckPage';
import { ChannelMonitorPage } from './features/safety/ChannelMonitorPage';
import { ChannelMonitorDetail } from './features/safety/ChannelMonitorDetail';

const PHASE_2 = 'Màn hình này sẽ có ở Đợt 2 của bản demo.';
const PHASE_3 = 'Màn hình này sẽ có ở Đợt 3 của bản demo.';

/** /ho-so-kol|mcn → first section (legacy ?tab= honoured); one route per section (sidebar item). */
function profileRoutes(path: string, ownerType: OwnerType): RouteObject {
  return {
    path,
    children: [
      { index: true, element: <ProfileIndexRedirect ownerType={ownerType} /> },
      ...PROFILE_SECTIONS.map((section) => ({
        path: section,
        element: <ProfilePage ownerType={ownerType} section={section} />,
      })),
    ],
  };
}

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
          profileRoutes('ho-so-kol', 'KOL'),
          profileRoutes('ho-so-mcn', 'MCN'),
          { path: 'kol-safety', element: <Navigate to="/kiem-duyet/video" replace /> },
          {
            path: 'kiem-duyet',
            children: [
              { index: true, element: <Navigate to="/kiem-duyet/video" replace /> },
              { path: 'video', element: <VideoCheckPage /> },
              { path: ':platform', element: <ChannelMonitorPage /> },
              { path: ':platform/:monitorId', element: <ChannelMonitorDetail /> },
            ],
          },
          { path: 'tim-kiem-kol', element: <SearchPage /> },
          { path: 'danh-sach-da-luu', element: <SavedListsPage /> },
          { path: 'tai-khoan-doanh-nghiep', element: <BizAccountPage /> },
        ],
      },
      { index: true, element: <Navigate to="/" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
