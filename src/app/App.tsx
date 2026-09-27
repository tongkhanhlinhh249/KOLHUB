import { RouterProvider } from 'react-router';
import { router } from './routes.tsx';
import { AuthProvider } from './auth/AuthContext';
import { Toaster } from './components/ui/sonner';
import { OtpInboxToaster } from './features/otp/OtpInboxToaster';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster richColors position="top-center" />
      <OtpInboxToaster />
    </AuthProvider>
  );
}
