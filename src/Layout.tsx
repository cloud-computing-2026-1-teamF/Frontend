// Renders the shared chrome (Nav + AuthModal) around every route's content.
import { Outlet, useLocation } from 'react-router-dom';
import { Nav } from './shared/Nav';
import { AuthModal } from './shared/AuthModal';

export function Layout() {
  const { pathname } = useLocation();
  // Nav highlights one of: 'home' / 'analyze' / 'vacancies' / 'shortlist' / 'history'.
  const active = pathname.startsWith('/analyze') ? 'analyze'
    : pathname.startsWith('/shortlist') ? 'shortlist'
    : pathname.startsWith('/vacancies') ? 'vacancies'
    : pathname.startsWith('/history') || pathname.startsWith('/detail') ? 'history'
    : 'home';
  return (
    <>
      <Nav active={active} />
      <Outlet />
      <AuthModal />
    </>
  );
}
