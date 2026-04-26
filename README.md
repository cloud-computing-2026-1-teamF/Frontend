# 서울상권 with AI

서울특별시에서 요식업 독립 창업자를 위한 입지 추천 서비스의 프론트엔드 애플리케이션이다.
지도에서 위치를 지정하면 주변 상권 데이터와 공실매물을 분석하여 생존율이 높은
**Top 3 공실매물**을 추천한다.

## Tech Stack

- React 18 + TypeScript
- Vite (dev server / build)
- React Router v6
- localStorage (mock 저장소)

## Getting Started

### Prerequisites

- Node.js 18 이상
- npm 9 이상

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

기본 포트는 `5173`이며, 사용 중일 경우 자동으로 `5174`로 할당된다.

### Build / Type Check

```bash
npm run typecheck    # tsc -b
npm run build        # 프로덕션 빌드 (dist/)
npm run preview      # 빌드 결과 로컬 미리보기
```

## Routes

| 경로 | 페이지 | 로그인 필요 |
|---|---|---|
| `/` | 메인 (랜딩) | ✗ |
| `/analyze` | 입지 분석 | ✓ |
| `/history` | 분석 이력 | ✓ |
| `/detail/:id` | 분석 상세 | ✓ |

비로그인 상태에서 보호 라우트로 접근하면 `/`로 리다이렉트되며 로그인 모달이 표시된다.
관련 로직은 `src/auth/ProtectedRoute.tsx`에 정의되어 있다.

## Project Structure

```
src/
├── main.tsx                 - Vite 엔트리 포인트
├── App.tsx                  - 라우트 테이블
├── Layout.tsx               - 공통 chrome (Nav + AuthModal)
│
├── auth/
│   ├── AuthContext.tsx      - 로그인 상태 전역 컨텍스트
│   └── ProtectedRoute.tsx   - 비로그인 가드
│
├── shared/                  - 공용 컴포넌트
│   ├── Icon.tsx             - SVG 아이콘
│   ├── AuthModal.tsx        - 로그인 / 회원가입 모달
│   ├── Nav.tsx              - 상단 네비게이션 + Footer
│   ├── FactorViz.tsx        - 4종 지표 시각화
│   ├── tokens.css           - 디자인 토큰
│   ├── nav.css / auth.css / factor-viz.css
│
├── pages/
│   ├── Landing/             - 메인 페이지
│   ├── Analyze/             - 입지 분석
│   ├── History/             - 분석 이력 리스트
│   └── Detail/              - 분석 상세 보기
│
├── data/
│   └── history.ts           - 시드 mock 분석 이력
└── lib/
    └── savedAnalyses.ts     - localStorage CRUD 헬퍼 / 타입
```

## Conventions

- 컴포넌트 파일: PascalCase `.tsx` (예: `Nav.tsx`)
- 헬퍼 / 타입 파일: camelCase `.ts` (예: `savedAnalyses.ts`)
- CSS는 컴포넌트와 동일한 디렉터리에 배치하고 `.tsx`에서 `import './X.css'`로 로드
- 클래스명은 prefix 기반 명명 (`lf-*`, `rr-*`, `dt-*`, `fv-*`)

---

# 팀 분담

- **A · 유저정보 파트** — 페이지 1, 2, 3, 9
- **B · 업종분석 파트** — 페이지 4, 5, 6, 7, 8, 10

## A · 유저정보 파트

### 1. 메인페이지

- `src/pages/Landing/Landing.tsx`
- `src/pages/Landing/Hero.tsx`
- `src/pages/Landing/Sections1.tsx` — `PainPoints`, `Features`
- `src/pages/Landing/Algorithm.tsx`
- `src/pages/Landing/LivePreview.tsx`
- `src/pages/Landing/Sections2.tsx` — `DataSources`, `FinalCTA`
- `src/pages/Landing/landing.css`
- `src/pages/Landing/landing-font-override.css`
- `src/shared/Nav.tsx`의 `Footer`

### 2. 메인페이지 — 로그인 위젯

- `src/shared/Nav.tsx` — `nav-cta` 영역의 로그인 / 회원가입 버튼
- `src/shared/AuthModal.tsx`
- `src/shared/auth.css`
- `src/auth/AuthContext.tsx` — `openAuth`, `closeAuth`, `login`

### 3. 프로필 클릭 시 로그아웃 버튼

- `src/shared/Nav.tsx` — `nav-user` / `nav-user-menu`
- `src/shared/nav.css` — `.nav-user`, `.nav-user-menu`
- `src/auth/AuthContext.tsx` — `logout`

### 9. 분석 이력 페이지

- `src/pages/History/History.tsx`
- `src/pages/History/history.css`
- `src/data/history.ts`
- `src/lib/savedAnalyses.ts` — `readSavedAnalyses`

---

## B · 업종분석 파트

### 4. 상권 분석 — 업종 선택

- `src/pages/Analyze/Analyze.tsx` — `BIZ_TYPES`, `LeftWidget`의 step 1, `lf-biz-grid`
- `src/pages/Analyze/analyze.css` — `.lf-biz-*`

### 5. KAKAO Map 위치 검색

- `src/pages/Analyze/Analyze.tsx` — `MapPickPanel`, `SEARCH_PLACES`, `handleSearchPan`
- `src/pages/Analyze/analyze.css` — `.lf-mapsearch-*`

### 6. 우클릭으로 위치 지정

- `src/pages/Analyze/Analyze.tsx` — `KakaoMap`의 `handleContextMenu`,
  `handlePickMarker`, `buildAreaFromPick`, `screenToLatLng`
- `src/pages/Analyze/analyze.css` — `.kakao-map`, 마커 / 반경 원

### 7. 분석중 위젯 (간소화 / SSE 미사용 / 비동기 처리)

- `src/pages/Analyze/Analyze.tsx` — `runAnalysis`, `LeftWidget`의 `'analyzing'` phase
- `src/pages/Analyze/analyze.css` — `.lf-widget.analyzing`, `.lf-analyzing-ring`

### 8. 분석 결과 / 매물 선택 시 사이드 위젯

- `src/pages/Analyze/Analyze.tsx` — `RightResults`, `PropertyDetail`
- `src/pages/Analyze/analyze.css` — `.rr-*`
- `src/shared/FactorViz.tsx` — `FactorCard`, `buildFactorViz`
- `src/shared/factor-viz.css`
- `src/lib/savedAnalyses.ts` — `writeSavedAnalyses`

### 10. 분석 이력 상세 보기 페이지

- `src/pages/Detail/Detail.tsx`
- `src/pages/Detail/detail.css`
- `src/shared/FactorViz.tsx`, `factor-viz.css`
- `src/lib/savedAnalyses.ts`

---

## 공유 영역

양쪽 파트가 모두 수정할 수 있는 파일이다. 작업 전 알림 후 수정한다.

| 파일 | 수정 사유 |
|---|---|
| `src/App.tsx` | 라우트 추가 / 변경 |
| `src/Layout.tsx` | Nav / Footer 위치 변경 |
| `src/shared/Nav.tsx` | 양쪽 작업이 네비 흐름에 영향을 주는 경우 |
| `src/shared/Icon.tsx` | 새 아이콘 추가 |
| `src/shared/tokens.css` | 디자인 토큰 추가 / 수정 |
| `src/auth/AuthContext.tsx` | A 주관 파일이나 B에서도 `useAuth()`로 read 사용 |
| `src/lib/savedAnalyses.ts` | B에서 write, 양쪽 모두 read |
| `package.json`, `vite.config.ts`, `tsconfig*.json` | 의존성 / 설정 변경 |

---

## 협업 가이드

- `main` 브랜치 직접 push 금지. 모든 변경은 PR로 머지한다.
- 브랜치 prefix: `feat/`, `fix/`, `refactor/`, `style/`
- 작업 시작 전 `git pull origin main`으로 동기화 후 `git checkout -b feat/xxx`
- 작은 단위로 자주 머지한다.
- PR 본문에는 변경 사항, 변경 이유, 관련 스크린샷을 포함한다.
- 공유 영역 파일을 수정하는 PR의 제목에는 `[shared]` 태그를 부착한다.
