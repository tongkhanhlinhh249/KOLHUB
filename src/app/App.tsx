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
      <RouterProvider router={router} />
      <Toaster richColors position="top-center" />
      <OtpInboxToaster />
      <NoticeInboxToaster />
    </AuthProvider>
  );
}
