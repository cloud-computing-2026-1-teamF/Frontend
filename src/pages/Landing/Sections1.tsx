// Pain points + Features section
import { Icon } from '../../shared/Icon';

export function PainPoints() {
  const items = [
    { n: '01', title: '흩어진 정보', as: '유동인구·임대료·경쟁 카페 수가 여러 사이트에 분산', to: '요식업 특화 데이터를 한 화면에서 통합 제공' },
    { n: '02', title: '분석 전문성 부재', as: '데이터가 있어도 "내 카페가 여기서 자리 잡을까?" 알 수 없음', to: '업종에 맞는 입지 점수를 한 눈에 확인' },
    { n: '03', title: '고비용 컨설팅', as: '상권 분석 보고서 1건 수백만 원, 프랜차이즈만 가능', to: '독립 창업자도 무료로 즉시 분석 결과 확인' },
    { n: '04', title: '불확실한 의사결정', as: '"여기 사람 많더라"는 직관으로 수천만 원 권리금 결정', to: '카페/디저트·한식·패스트푸드 등 업종별 Top 3 공실매물 비교 제공' },
  ];
  return (
    <section className="section section-dark" style={{ fontFamily: 'Pretendard' }}>
      <div className="container">
        <div className="section-head">
          <div className="eyebrow" style={{ color: '#F26B2E' }}>요식업 창업자의 현실</div>
          <h2 className="sec-title light">
            요식업 독립 창업자가<br />
            <span className="tx-brand">실제로 겪는 4가지 문제</span>
          </h2>
          <p className="sec-sub light">
            국내 요식업 자영업자의 약 60%가 5년 이내 폐업합니다.<br />
            데이터 기반 입지 분석이 없어서입니다.
          </p>
        </div>
        <div className="pain-grid">
          {items.map((it) => (
            <div key={it.n} className="pain-card">
              <div className="pain-num mono">{it.n}</div>
              <h3>{it.title}</h3>
              <div className="pain-row">
                <span className="pain-tag bad">현실</span>
                <span className="pain-text">{it.as}</span>
              </div>
              <div className="pain-row">
                <span className="pain-tag good">해결</span>
                <span className="pain-text">{it.to}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Features() {
  const items = [
    { icon: 'coffee', color: '#E85D1F', bg: 'var(--brand-100)', title: '업종별 맞춤 분석', desc: '한식·중식·일식·서양식·카페/디저트·패스트푸드·주점업·구내식당 및 뷔페·기타 9개 요식업 업종에 맞춰 드려요' },
    { icon: 'map-pin', color: '#0FB5A6', bg: 'var(--teal-100)', title: '지도 마커 기반 입지 선택', desc: '행정동 단위가 아닌 지도 좌표 기반. 마커를 찍은 지점 일대의 공실매물·상권만 정밀 분석해드려요' },
    { icon: 'cpu', color: '#3B6FE8', bg: 'var(--blue-100)', title: '입지 점수', desc: '유동인구·경쟁·동네 평균 추정 매출을 종합해 0~100점으로 한눈에 보여드려요' },
    { icon: 'shield', color: '#7C5CE6', bg: 'var(--violet-100)', title: '프랜차이즈 제외', desc: '소상공인 독립 창업자만을 위한 서비스. 프랜차이즈 전용 분석 도구와 다릅니다' },
  ];
  return (
    <section className="section" style={{ fontFamily: 'Pretendard' }}>
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Features</div>
          <h2 className="sec-title">
            요식업 독립 창업자를 위한<br />
            <span className="tx-muted">입지 추천 서비스.</span>
          </h2>
        </div>
        <div className="feat-grid">
          {items.map((it) => (
            <div key={it.title} className="feat-card">
              <div className="feat-icon" style={{ background: it.bg, color: it.color }}>
                <Icon name={it.icon} size={22} />
              </div>
              <h3>{it.title}</h3>
              <p>{it.desc}</p>
              <a href="#" className="feat-more">자세히<Icon name="arrow-right" size={12} /></a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProductTour() {
  const pages = [
    {
      icon: 'map-pin',
      title: '입지분석',
      tag: '반경 기반 추천',
      desc: '지도에서 후보 지점을 고르고 업종·거래유형·예산·반경을 조절하면 조건 안의 공실만 먼저 확인한 뒤 Top 3를 평가해요.',
      bullets: ['반경 내 공실 마커 미리보기', '임대·전세·매매 조건 분리', '추천/비추천 근거 표시'],
      tone: 'orange',
    },
    {
      icon: 'building',
      title: '공실탐색',
      tag: '매물 인벤토리',
      desc: '서울 공실을 지도와 표로 동시에 살펴보고 업종 점수, 임대 부담, 유동인구, 접근성 데이터를 빠르게 비교해요.',
      bullets: ['행정동 클러스터 지도', '월세·보증금·면적 필터', '상권 지표 상세 보기'],
      tone: 'teal',
    },
    {
      icon: 'bookmark',
      title: '찜목록',
      tag: '후보 저장',
      desc: '관심 공실을 계정에 저장해두고 다시 방문해도 같은 후보를 이어서 검토할 수 있어요.',
      bullets: ['서버 저장형 찜', '후보별 핵심 KPI', '비교 후보로 전환'],
      tone: 'blue',
    },
    {
      icon: 'clock',
      title: '분석이력',
      tag: '의사결정 로그',
      desc: '언제 어떤 조건으로 분석했는지 남기고, 추천 공실의 유동 패턴과 접근성 결과를 상세 페이지에서 다시 확인해요.',
      bullets: ['분석 조건 기록', 'Top 3 결과 보존', '상세 리포트 재열람'],
      tone: 'violet',
    },
  ];

  return (
    <section className="section section-product" style={{ fontFamily: 'Pretendard' }}>
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Service Map</div>
          <h2 className="sec-title">
            창업 입지 선택에 필요한 화면을<br />
            <span className="tx-brand">하나의 흐름으로 연결했어요.</span>
          </h2>
          <p className="sec-sub">
            추천 결과만 보여주는 도구가 아니라, 후보 탐색부터 저장·비교·이력 관리까지 이어지는 작업 공간입니다.
          </p>
        </div>

        <div className="product-tour-grid">
          {pages.map(page => (
            <article key={page.title} className={`product-card tone-${page.tone}`}>
              <div className="product-card-head">
                <div className="product-icon"><Icon name={page.icon} size={20} /></div>
                <span>{page.tag}</span>
              </div>
              <h3>{page.title}</h3>
              <p>{page.desc}</p>
              <ul>
                {page.bullets.map(bullet => (
                  <li key={bullet}><Icon name="check" size={12} />{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
