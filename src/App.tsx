// Top-level route table.
//
// Auth model:
//   /            - public landing
//   /analyze     - login required (analyze flow)
//   /history     - login required (saved + mock history list)
//   /detail/:id  - login required (single analysis breakdown)
//
// All protected routes share <ProtectedRoute/>, which redirects to "/" and
// pops the auth modal when the user isn't logged in. Nav + AuthModal are
// rendered for every route from inside <Layout/>.

import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './app/AppRoutes';
import { AuthProvider } from './auth/AuthContext';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
