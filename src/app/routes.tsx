import { createBrowserRouter, Navigate, useLocation, type RouteObject } from 'react-router';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AccessGuard } from './auth/AccessGuard';
import { GuestLayout } from './layouts/GuestLayout';
import { MarketplaceLayout } from './layouts/MarketplaceLayout';
import { MARKETPLACE_PATH, SUPPLIER_CAMPAIGNS_PATH } from './auth/roles';
import { RegisterPage } from './features/register/RegisterPage';
import { LoginPage } from './features/login/LoginPage';
import { ForgotPasswordPage } from './features/login/ForgotPasswordPage';
// --- phase 3 ---
import { SearchPage } from './features/biz-search/SearchPage';
import { SavedListsPage } from './features/saved-lists/SavedListsPage';
import { BizAccountPage } from './features/biz-account/BizAccountPage';
// --- phase 2 ---
import { LegacySectionRedirect, ProfileIndexRedirect, ProfilePage } from './features/profile/ProfilePage';
import { LEGACY_SECTION_ANCHOR, PROFILE_SECTIONS } from './features/profile/primaryAction';
import type { OwnerType } from './services';
// --- KOL Safety ---
import { VideoCheckPage } from './features/safety/VideoCheckPage';
import { ChannelMonitorPage } from './features/safety/ChannelMonitorPage';
import { ChannelMonitorDetail } from './features/safety/ChannelMonitorDetail';
// --- violations ---
import { OwnerViolationsPage } from './features/violations/OwnerViolationsPage';
import { BrandViolationsPage } from './features/violations/BrandViolationsPage';
// --- channel directory ---
import { ChannelDirectoryPage } from './features/channel-directory/ChannelDirectoryPage';
// --- MCN ↔ KOL ---
import { McnKolsPage } from './features/mcn-kols/McnKolsPage';
// --- campaign booking (KOL/MCN supplier side) ---
import { AppsPage } from './features/apps/AppsPage';
import { MarketplacePage } from './features/supplier-booking/MarketplacePage';
import { BookingsPage } from './features/supplier-booking/BookingsPage';
// --- campaign booking (Brand) ---
import { CampaignsPage } from './features/campaigns/CampaignsPage';
import { CampaignFormPage } from './features/campaigns/CampaignFormPage';
import { CampaignDetailPage } from './features/campaigns/CampaignDetailPage';

const PHASE_2 = 'Màn hình này sẽ có ở Đợt 2 của bản demo.';
const PHASE_3 = 'Màn hình này sẽ có ở Đợt 3 của bản demo.';

/** Moved page: redirect keeping the query and hash (e.g. /booking?booking=… → /chien-dich-cua-toi?booking=…). */
function MovedTo({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
}

/** /ho-so-kol|mcn → first section (legacy ?tab= honoured); one route per section (sidebar item) + old section redirects. */
function profileRoutes(path: string, ownerType: OwnerType, extra: RouteObject[] = []): RouteObject {
  return {
    path,
    children: [
      { index: true, element: <ProfileIndexRedirect ownerType={ownerType} /> },
      ...PROFILE_SECTIONS.map((section) => ({
        path: section,
        element: <ProfilePage ownerType={ownerType} section={section} />,
      })),
      // Merged into "Thông tin hồ sơ" (thong-tin): keep old links and bookmarks working.
      ...Object.entries(LEGACY_SECTION_ANCHOR).map(([path, anchor]) => ({
        path,
        element: <LegacySectionRedirect ownerType={ownerType} anchor={anchor} />,
      })),
      ...extra,
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
      // Sàn chiến dịch: public, own layout (outside the app shell).
      { path: 'san', element: <MarketplaceLayout />, children: [{ index: true, element: <MarketplacePage /> }] },
      { path: 'san-chien-dich', element: <MovedTo to={MARKETPLACE_PATH} /> },
      {
        element: <Layout />,
        children: [
          profileRoutes('ho-so-kol', 'KOL'),
          profileRoutes('ho-so-mcn', 'MCN', [{ path: 'kol', element: <McnKolsPage /> }]),
          { path: 'kol-safety', element: <Navigate to="/ung-dung" replace /> },
          {
            path: 'kiem-duyet',
            children: [
              { index: true, element: <Navigate to="/ung-dung" replace /> },
              { path: 'video', element: <VideoCheckPage /> },
              { path: 'vi-pham', element: <OwnerViolationsPage /> },
              { path: ':platform', element: <ChannelMonitorPage /> },
              { path: ':platform/:monitorId', element: <ChannelMonitorDetail /> },
            ],
          },
          { path: 'ung-dung', element: <AppsPage /> },
          { path: 'chien-dich-cua-toi', element: <BookingsPage /> },
          { path: 'booking', element: <MovedTo to={SUPPLIER_CAMPAIGNS_PATH} /> },
          { path: 'tim-kiem-kol', element: <SearchPage /> },
          {
            path: 'chien-dich',
            children: [
              { index: true, element: <CampaignsPage /> },
              { path: 'tao', element: <CampaignFormPage key="new" /> },
              { path: ':id', element: <CampaignDetailPage /> },
              { path: ':id/sua', element: <CampaignFormPage /> },
            ],
          },
          { path: 'danh-sach-kenh', element: <ChannelDirectoryPage /> },
          { path: 'danh-sach-da-luu', element: <SavedListsPage /> },
          { path: 'vi-pham-kol', element: <BrandViolationsPage /> },
          { path: 'tai-khoan-doanh-nghiep', element: <BizAccountPage /> },
        ],
      },
      { index: true, element: <Navigate to="/" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
