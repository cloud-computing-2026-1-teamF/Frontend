import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { Layout } from '../Layout';
import { Analyze } from '../pages/Analyze/Analyze';
import { Detail } from '../pages/Detail/Detail';
import { History } from '../pages/History/History';
import { Landing } from '../pages/Landing/Landing';
import { Vacancies } from '../pages/Vacancies/Vacancies';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/vacancies" element={<Vacancies />} />
          <Route path="/history" element={<History />} />
          <Route path="/detail/:id" element={<Detail />} />
        </Route>
      </Route>
    </Routes>
  );
}
