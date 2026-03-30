import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { getMe } from '../api/local.js';

export function ProtectedRoute({ children, adminOnly = false }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    if (adminOnly) {
      getMe().then(res => {
        if (res.user?.role !== 'admin') navigate('/dashboard');
      }).catch(() => { localStorage.removeItem('auth_token'); navigate('/'); });
    }
  }, [token, adminOnly, navigate]);

  if (!token) return null;
  return <>{children}</>;
}
