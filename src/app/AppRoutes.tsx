import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { Layout } from '../Layout';
import { Analyze } from '../pages/Analyze/Analyze';
import { Detail } from '../pages/Detail/Detail';
import { History } from '../pages/History/History';
import { Landing } from '../pages/Landing/Landing';
import { Vacancies } from '../pages/Vacancies/Vacancies';
import { VacancyCompare } from '../pages/Vacancies/VacancyCompare';
import { VacancyDetail } from '../pages/Vacancies/VacancyDetail';
import { Shortlist } from '../pages/Vacancies/Shortlist';
import { KakaoCallback } from '../auth/KakaoCallback';
import { NaverCallback } from '../auth/NaverCallback';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
        <Route path="/auth/naver/callback" element={<NaverCallback />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/vacancies" element={<Vacancies />} />
          <Route path="/vacancies/compare" element={<VacancyCompare />} />
          <Route path="/vacancies/:id" element={<VacancyDetail />} />
          <Route path="/shortlist" element={<Shortlist />} />
          <Route path="/history" element={<History />} />
          <Route path="/detail/:id" element={<Detail />} />
        </Route>
      </Route>
    </Routes>
  );
}
