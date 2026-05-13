// Data sources + Final CTA
import { Link } from 'react-router-dom';
import { Icon } from '../../shared/Icon';

export function DataSources() {
  const sources = [
    {
      name: '서울 열린데이터광장',
      tag: '공공 데이터',
      desc: '유동인구·동네 평균 추정 매출·경쟁 점포 수를 좌표(X/Y) 단위로 활용',
      stat: '152K+',
      statLabel: '데이터 건수',
      color: '#3B6FE8',
      icon: 'database',
    },
    {
      name: '실제 공실매물 정보',
      tag: '주 1회 업데이트',
      desc: '실제로 거래 가능한 공실매물의 월세·보증금·관리비·층수·면적·좌표 — 마커 반경 안의 매물만 추려요',
      stat: '4.6K',
      statLabel: '공실매물 수',
      color: '#E85D1F',
      icon: 'building',
    },
    {
      name: '연도별 상권 이력',
      tag: '2020~2024',
      desc: '연도별 업종 변화 흐름으로 실제 생존·폐업 근거를 확보',
      stat: '2020–24',
      statLabel: '분석 범위',
      color: '#0FB5A6',
      icon: 'layers',
    },
  ];
  return (
    <section className="section section-alt" style={{ fontFamily: 'Pretendard' }}>
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Data Trust</div>
          <h2 className="sec-title">신뢰할 수 있는<br /><span className="tx-brand">공공 + 실제 데이터</span></h2>
          <p className="sec-sub">추천 결과의 바탕이 되는 데이터를 투명하게 보여드려요.</p>
        </div>

        <div className="ds-grid">
          {sources.map(s => (
            <div key={s.name} className="ds-card">
              <div className="ds-top">
                <div className="ds-icon" style={{ color: s.color }}>
                  <Icon name={s.icon} size={22} />
                </div>
                <span className="ds-tag mono">{s.tag}</span>
              </div>
              <h3>{s.name}</h3>
              <p>{s.desc}</p>
              <div className="ds-stat">
                <div className="ds-stat-num num" style={{ color: s.color }}>{s.stat}</div>
                <div className="ds-stat-lab mono">{s.statLabel}</div>
              </div>
              <div className="ds-bar"><span style={{ background: s.color, width: '78%' }} /></div>
            </div>
          ))}
        </div>

        <div className="ds-note mono">
          <Icon name="shield" size={14} />
          공공 기관의 공식 채널에서 받아온 데이터만 사용해요.
        </div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="section section-cta" style={{ fontFamily: 'Pretendard' }}>
      <div className="container">
        <div className="cta-wrap">
          <div className="cta-text">
            <div className="eyebrow" style={{ color: '#F26B2E' }}>요식업 창업, 지금 시작하세요</div>
            <h2>
              카페/디저트·한식·패스트푸드 어떤 업종이든<br />
              지도에 위치만 찍으면 끝.
            </h2>
            <p>업종 선택 → 지도에서 마커 픽 → 마커 주변 Top 3 공실매물 추천. 독립 창업자 전용 서비스예요.</p>
          </div>
          <div className="cta-buttons">
            <Link to="/analyze" className="btn btn-primary btn-lg">
              <Icon name="sparkles" size={16} /> 지도에서 입지 분석하기
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
