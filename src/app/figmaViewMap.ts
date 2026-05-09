export type FigmaViewKey =
  | 'landing'
  | 'auth-modal'
  | 'profile-menu'
  | 'analyze-business'
  | 'analyze-location-search'
  | 'analyze-location-pick'
  | 'analyze-running'
  | 'analyze-results'
  | 'history'
  | 'detail';

export const FIGMA_FILE_KEY = 'IX9yIYpjA6xCM4PKJWB2yt';
export const FIGMA_FILE_URL = 'https://www.figma.com/design/IX9yIYpjA6xCM4PKJWB2yt/UX-UI-Design';

export type FigmaViewMapItem = {
  key: FigmaViewKey;
  label: string;
  figmaNodeId: string;
  figmaUrl: string;
  route: string;
  component: string;
  apiSurface: string[];
};

function figmaUrl(nodeId: string) {
  return `${FIGMA_FILE_URL}?node-id=${nodeId.replace(':', '-')}`;
}

export const FIGMA_VIEW_MAP: FigmaViewMapItem[] = [
  {
    key: 'landing',
    label: '1. 메인페이지',
    figmaNodeId: '52:6',
    figmaUrl: figmaUrl('52:6'),
    route: '/',
    component: 'pages/Landing',
    apiSurface: ['GET /v1/auth/me'],
  },
  {
    key: 'auth-modal',
    label: '2. 메인페이지 - 로그인 위젯',
    figmaNodeId: '52:1065',
    figmaUrl: figmaUrl('52:1065'),
    route: 'global modal',
    component: 'shared/AuthModal',
    apiSurface: ['POST /v1/auth/login', 'POST /v1/auth/signup', 'GET /v1/auth/me'],
  },
  {
    key: 'profile-menu',
    label: '3. 메인페이지 - 프로필 눌렀을 때 로그아웃 버튼',
    figmaNodeId: '52:2237',
    figmaUrl: figmaUrl('52:2237'),
    route: 'global nav',
    component: 'shared/Nav',
    apiSurface: ['POST /v1/auth/logout'],
  },
  {
    key: 'analyze-business',
    label: '4. 상권 분석 페이지 - 업종 선택',
    figmaNodeId: '52:3302',
    figmaUrl: figmaUrl('52:3302'),
    route: '/analyze',
    component: 'pages/Analyze + features/analyze',
    apiSurface: ['GET /v1/business-types'],
  },
  {
    key: 'analyze-location-search',
    label: '5. 상권 분석 페이지 - KAKAO map 위치 검색 기능',
    figmaNodeId: '52:3548',
    figmaUrl: figmaUrl('52:3548'),
    route: '/analyze',
    component: 'pages/Analyze + features/analyze',
    apiSurface: ['GET /v1/areas/search'],
  },
  {
    key: 'analyze-location-pick',
    label: '6. 상권 분석 페이지 - 사용자가 위치를 우클릭으로 지정',
    figmaNodeId: '52:3825',
    figmaUrl: figmaUrl('52:3825'),
    route: '/analyze',
    component: 'pages/Analyze + features/analyze',
    apiSurface: ['GET /v1/areas/search'],
  },
  {
    key: 'analyze-running',
    label: '7. 상권 분석 페이지 - 분석중 위젯 간소화, SSE 안씀, 비동기 처리',
    figmaNodeId: '52:4061',
    figmaUrl: figmaUrl('52:4061'),
    route: '/analyze',
    component: 'pages/Analyze + features/analyze',
    apiSurface: ['POST /v1/analyses', 'GET /v1/analyses/:id', 'GET /v1/analyses/:id/poll'],
  },
  {
    key: 'analyze-results',
    label: '8. 상권 분석 페이지 - 분석 결과, 매물을 선택 했을때 사이드 위젯',
    figmaNodeId: '52:4251',
    figmaUrl: figmaUrl('52:4251'),
    route: '/analyze',
    component: 'pages/Analyze + features/analyze',
    apiSurface: ['PATCH /v1/analyses/:id'],
  },
  {
    key: 'history',
    label: '9. 분석 이력 페이지',
    figmaNodeId: '52:4781',
    figmaUrl: figmaUrl('52:4781'),
    route: '/history',
    component: 'pages/History',
    apiSurface: ['GET /v1/analyses', 'DELETE /v1/analyses/:id', 'GET /v1/users/me/stats'],
  },
  {
    key: 'detail',
    label: '10. 분석 이력 상세 보기 페이지',
    figmaNodeId: '52:5485',
    figmaUrl: figmaUrl('52:5485'),
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
