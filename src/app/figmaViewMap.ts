export type FigmaViewKey =
  | 'landing'
  | 'auth-modal'
  | 'analyze-business'
  | 'analyze-location'
  | 'analyze-running'
  | 'analyze-results'
  | 'history'
  | 'detail';

export type FigmaViewMapItem = {
  key: FigmaViewKey;
  label: string;
  route: string;
  component: string;
  apiSurface: string[];
};

export const FIGMA_VIEW_MAP: FigmaViewMapItem[] = [
  {
    key: 'landing',
    label: '메인 페이지',
    route: '/',
    component: 'pages/Landing',
    apiSurface: ['GET /v1/auth/me'],
  },
  {
    key: 'auth-modal',
    label: '로그인 / 회원가입 모달',
    route: 'global modal',
    component: 'shared/AuthModal',
    apiSurface: ['POST /v1/auth/login', 'POST /v1/auth/signup', 'GET /v1/auth/me'],
  },
  {
    key: 'analyze-business',
    label: '입지 분석 - 업종 선택',
    route: '/analyze',
    component: 'pages/Analyze LeftWidget',
    apiSurface: ['GET /v1/business-types'],
  },
  {
    key: 'analyze-location',
    label: '입지 분석 - 지역 검색 / 지도 선택',
    route: '/analyze',
    component: 'pages/Analyze MapPickPanel + KakaoCanvas',
    apiSurface: ['GET /v1/areas/search'],
  },
  {
    key: 'analyze-running',
    label: '입지 분석 중',
    route: '/analyze',
    component: 'pages/Analyze analyzing phase',
    apiSurface: ['POST /v1/analyses', 'GET /v1/analyses/:id', 'GET /v1/analyses/:id/events'],
  },
  {
    key: 'analyze-results',
    label: '입지 분석 완료 / 추천 Top 3',
    route: '/analyze',
    component: 'pages/Analyze RightResults',
    apiSurface: ['PATCH /v1/analyses/:id'],
  },
  {
    key: 'history',
    label: '분석 이력',
    route: '/history',
    component: 'pages/History',
    apiSurface: ['GET /v1/analyses', 'DELETE /v1/analyses/:id', 'GET /v1/users/me/stats'],
  },
  {
    key: 'detail',
    label: '상세 보기',
    route: '/detail/:id',
    component: 'pages/Detail',
    apiSurface: [
      'GET /v1/analyses/:id',
      'GET /v1/analyses/:id/recommended-properties',
      'GET /v1/analyses/:id/key-metrics',
      'GET /v1/analyses/:id/foot-traffic',
      'GET /v1/analyses/:id/competition',
      'GET /v1/analyses/:id/estimated-revenue',
      'GET /v1/analyses/:id/industry-growth',
      'GET /v1/analyses/:id/accessibility',
    ],
  },
];
