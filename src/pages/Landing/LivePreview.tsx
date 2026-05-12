// Live analyze preview — mirrors the actual /analyze flow
import { Icon } from '../../shared/Icon';
import { HeroMap } from './Hero';

// Mirrors GET /v1/business-types (and FALLBACK_BIZ_TYPES in
// features/analyze/model.ts) so the landing chips match what the real
// /analyze page actually offers.
const BIZ_TYPES = [
  { key: '1', label: '한식',              emoji: '🍚' },
  { key: '9', label: '카페/디저트',       emoji: '☕' },
  { key: '7', label: '패스트푸드',        emoji: '🍔' },
  { key: '8', label: '주점업',            emoji: '🍻' },
  { key: '3', label: '일식',              emoji: '🍣' },
  { key: '4', label: '서양식',            emoji: '🍝' },
  { key: '2', label: '중식',              emoji: '🥟' },
  { key: '6', label: '구내식당 및 뷔페',  emoji: '🥘' },
  { key: '5', label: '기타',              emoji: '🍽️' },
];

export function LivePreview() {
  return (
    <section className="section" style={{ fontFamily: 'Pretendard' }}>
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Experience</div>
          <h2 className="sec-title">두 번 고르면 <span className="tx-brand">Top 3 공실매물</span> 완성</h2>
          <p className="sec-sub">업종을 고르고, 지도에서 분석할 위치를 찍으면 돼요. 지도 위에 딱 맞는 3곳이 표시됩니다.</p>
        </div>

        <div className="lp-wrap">
          <div className="lp-panel lp-input">
            <div className="lp-step complete">
              <div className="lp-step-head">
                <div className="lp-step-num done">✓</div>
                <div style={{ flex: 1 }}>
                  <div className="lp-step-label">분석 업종</div>
                  <div className="lp-step-val">☕ 카페/디저트</div>
                </div>
                <span className="lp-step-edit">변경</span>
              </div>
            </div>

            <div className="lp-step active">
              <div className="lp-step-head">
                <div className="lp-step-num active">2</div>
                <div style={{ flex: 1 }}>
                  <div className="lp-step-label">분석 위치 · 반경</div>
                </div>
              </div>
              <div className="lp-step-content">
                <div className="lp-search">
                  <Icon name="search" size={14} />
                  <span>홍대입구역</span>
                </div>
                <div className="lp-search-results">
                  <div className="lp-search-item is-on">
                    <Icon name="map-pin" size={12} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="lp-sr-name">홍대입구역</div>
                      <div className="lp-sr-addr mono">지하철역 · 서울 마포구 양화로 160</div>
                    </div>
                    <span className="lp-sr-tag">역</span>
                  </div>
                  <div className="lp-search-item">
                    <Icon name="map-pin" size={12} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="lp-sr-name">스타벅스 홍대입구역점</div>
                      <div className="lp-sr-addr mono">카페 · 서울 마포구 양화로 162</div>
                    </div>
                    <span className="lp-sr-tag">곳</span>
                  </div>
                  <div className="lp-search-item">
                    <Icon name="map-pin" size={12} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="lp-sr-name">서교동 367 일대</div>
                      <div className="lp-sr-addr mono">동네 · 서울 마포구 서교동</div>
                    </div>
                    <span className="lp-sr-tag">동</span>
                  </div>
                </div>

                <div className="lp-pick-summary">
                  <span className="lp-pick-dot" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="lp-pick-line">📍 마커 찍힘 · <b>서교동</b></div>
                    <div className="lp-pick-meta mono">마커 주변 상권 분석</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lp-biz-hint">
              <div className="lp-biz-hint-title">이런 업종도 가능해요</div>
              <div className="lp-biz-mini">
                {BIZ_TYPES.slice(0, 9).map(t => (
                  <span key={t.key} className={`lp-biz-chip ${t.key === 'cafe' ? 'is-on' : ''}`}>
                    <span style={{ fontSize: 13 }}>{t.emoji}</span>
                    <span>{t.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="lp-panel lp-map">
            <div className="lp-map-head">
              <div className="lp-map-title">
                <Icon name="map-pin" size={14} /> 마커 위치 · 주변 상권
              </div>
              <div className="lp-map-chip mono">Top 3 표시</div>
            </div>
            <div className="lp-map-body">
              <HeroMap />
            </div>
            <div className="lp-legend mono">
              <span><i style={{ background: '#E85D1F' }} />유동인구 많음</span>
              <span><i style={{ background: '#F4B431' }} />중간</span>
              <span><i style={{ background: '#3B6FE8' }} />적음</span>
            </div>
          </div>

          <div className="lp-panel lp-results">
            <div className="lp-tab">
              <span className="lp-done-ico"><Icon name="check" size={12} stroke={2.5} /></span>
              <span>분석 완료 · Top 3</span>
            </div>
            {[
              { rank: 1, addr: '서교동 367-12', floor: '1F', score: 92, rent: 280, dep: 3000, foot: 9200, comp: 3, color: '#E85D1F' },
              { rank: 2, addr: '동교동 154-8',  floor: '1F', score: 86, rent: 245, dep: 2500, foot: 7800, comp: 5, color: '#F4B431' },
              { rank: 3, addr: '서교동 401-3',  floor: 'B1', score: 79, rent: 210, dep: 2000, foot: 6400, comp: 4, color: '#0FB5A6' },
            ].map(p => (
              <div key={p.rank} className="lp-res">
                <div className="lp-res-top">
                  <span className="lp-res-rank" style={{ background: p.color }}>{p.rank}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="lp-res-addr">{p.addr}</div>
                    <div className="lp-res-floor mono">{p.floor}</div>
                  </div>
                  <div className="lp-res-score num">{p.score}</div>
                </div>
                <div className="lp-res-bar"><span style={{ width: `${p.score}%`, background: p.color }} /></div>
                <div className="lp-res-meta mono">
                  <span>월세 {p.rent}</span>
                  <span>보증 {p.dep}</span>
                  <span>유동 {p.foot.toLocaleString()}</span>
                  <span>경쟁 {p.comp}</span>
                </div>
              </div>
            ))}
            <div className="lp-disclaimer mono">
              <Icon name="info" size={12} /> 참고용 자료예요. 실제 성공을 보장하지는 않아요.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
