// Gate routes that require login. If the user isn't authenticated we send
// them back to the landing page and pop the auth modal open immediately.
//
// We MUST wait on `bootstrapping` before deciding to redirect — otherwise
// a refresh on /history or /detail/:id will bounce the user during the brief
// window where `GET /auth/me` is still in flight.
import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute() {
  const { user, openAuth, bootstrapping } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!bootstrapping && !user) openAuth('login');
  }, [bootstrapping, user, openAuth]);

  if (bootstrapping) return null;
  if (!user) return <Navigate to="/" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}
