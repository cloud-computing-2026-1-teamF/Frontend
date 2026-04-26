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

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './Layout';
import { Landing } from './pages/Landing/Landing';
import { Analyze } from './pages/Analyze/Analyze';
import { History } from './pages/History/History';
import { Detail } from './pages/Detail/Detail';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/analyze" element={<Analyze />} />
              <Route path="/history" element={<History />} />
              <Route path="/detail/:id" element={<Detail />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
