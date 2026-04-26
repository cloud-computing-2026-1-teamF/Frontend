// Gate routes that require login. If the user isn't authenticated we send
// them back to the landing page and pop the auth modal open immediately.
import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute() {
  const { user, openAuth } = useAuth();
  const location = useLocation();

  // Open the auth modal when bouncing the user back. Effect runs once per
  // bounce so we don't re-trigger on repeat re-renders.
  useEffect(() => {
    if (!user) openAuth('login');
  }, [user, openAuth]);

  if (!user) return <Navigate to="/" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}
