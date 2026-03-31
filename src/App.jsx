import { createBrowserRouter, RouterProvider } from 'react-router';
import { LoginPage } from './pages/LoginPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { UsersPage } from './pages/UsersPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { ClientsPage } from './pages/ClientsPage.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';

const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/dashboard', element: <ProtectedRoute><DashboardPage /></ProtectedRoute> },
  { path: '/users', element: <ProtectedRoute adminOnly><UsersPage /></ProtectedRoute> },
  { path: '/settings', element: <ProtectedRoute adminOnly><SettingsPage /></ProtectedRoute> },
  { path: '/clients',  element: <ProtectedRoute adminOnly><ClientsPage /></ProtectedRoute> },
], { basename: import.meta.env.PROD ? '/meta' : '/' });

export default function App() {
  return <RouterProvider router={router} />;
}
