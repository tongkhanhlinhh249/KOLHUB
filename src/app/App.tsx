import { RouterProvider } from 'react-router';
import { router } from './routes.tsx';
import { AuthProvider } from './auth/AuthContext';
import { Toaster } from './components/ui/sonner';
import { OtpInboxToaster } from './features/otp/OtpInboxToaster';
// --- phase 2 ---
import { NoticeInboxToaster } from './features/notice/NoticeInboxToaster';

export default function App() {
  return (
    <AuthProvider>
      {/* Mounted before the router so its subscription exists when a guard toasts on first load (BR-67). */}
      <Toaster richColors position="top-center" />
      <RouterProvider router={router} />
      <OtpInboxToaster />
      <NoticeInboxToaster />
    </AuthProvider>
  );
}
