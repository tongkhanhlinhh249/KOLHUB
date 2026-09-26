import { RouterProvider } from 'react-router';
import { router } from './routes.tsx';
import { UserProvider } from './contexts/UserContext';

export default function App() {
  return (
    <UserProvider>
      <RouterProvider router={router} />
    </UserProvider>
  );
}