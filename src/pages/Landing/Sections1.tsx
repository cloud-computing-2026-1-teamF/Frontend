// Pain points + Features section
import { Icon } from '../../shared/Icon';

export function PainPoints() {
  const items = [
    { n: '01', title: '흩어진 정보', as: '유동인구·임대료·경쟁 카페 수가 여러 사이트에 분산', to: '요식업 특화 데이터를 한 화면에서 통합 제공' },
    { n: '02', title: '분석 전문성 부재', as: '데이터가 있어도 "내 카페가 여기서 살아남을까?" 알 수 없음', to: '업종에 맞는 생존율 점수를 한 눈에 확인' },
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
    { icon: 'cpu', color: '#3B6FE8', bg: 'var(--blue-100)', title: '생존율 점수', desc: '유동인구·경쟁·추정매출·성장률을 종합해 0~100점으로 한눈에 보여드려요' },
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
