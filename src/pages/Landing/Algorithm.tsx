// How it works — 3-step user-friendly flow
import { Icon } from '../../shared/Icon';

export function Algorithm() {
  return (
    <section className="section section-alt" style={{ fontFamily: 'Pretendard' }}>
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">How it works</div>
          <h2 className="sec-title">두 번의 선택으로<br /><span className="tx-brand">내 가게 자리가 보여요</span></h2>
          <p className="sec-sub">
            업종을 고르고, 지도에서 위치 한 번 찍으면 끝이에요.
          </p>
        </div>

        <div className="algo-flow">
          <div className="algo-node algo-step1">
            <div className="an-head">
              <span className="an-num">STEP 1</span>
              <span className="an-title">업종 고르기</span>
            </div>
            <div className="an-body">
              <div className="an-desc">열고 싶은 가게를 선택해요</div>
              <div className="an-features">
                <span className="feat-pill">🍚 한식</span>
                <span className="feat-pill">☕ 카페/디저트</span>
                <span className="feat-pill">🍔 패스트푸드</span>
                <span className="feat-pill">🍻 주점업</span>
              </div>
              <div className="an-output mono">9개 업종 지원</div>
            </div>
          </div>

          <svg className="algo-arrow" viewBox="0 0 80 40"><path d="M0 20 L70 20 M60 10 L72 20 L60 30" stroke="#9AA3BD" strokeWidth="1.5" fill="none" /></svg>

          <div className="algo-node algo-step2">
            <div className="an-head">
              <span className="an-num">STEP 2</span>
              <span className="an-title">지도에서 위치 찍기</span>
            </div>
            <div className="an-body">
              <div className="an-desc">검색하거나 지도를 움직여 우클릭으로 마커를 찍어요</div>
              <div className="an-features">
                <span className="feat-pill"><i style={{ background: '#0A7A5B' }} />마커</span>
                <span className="feat-pill"><i style={{ background: '#0FB5A6' }} />주변 상권</span>
                <span className="feat-pill"><i style={{ background: '#3B6FE8' }} />장소 검색</span>
              </div>
              <div className="an-output mono">원하는 지점 자유롭게</div>
            </div>
          </div>

          <svg className="algo-arrow" viewBox="0 0 80 40"><path d="M0 20 L70 20 M60 10 L72 20 L60 30" stroke="#9AA3BD" strokeWidth="1.5" fill="none" /></svg>

          <div className="algo-node algo-step3">
            <div className="an-head">
              <span className="an-num">STEP 3</span>
              <span className="an-title">Top 3 공실매물 확인</span>
            </div>
            <div className="an-body">
              <div className="an-desc">입지 점수가 높은 순서로 3곳을 추천해요</div>
              <div className="out-item"><span className="out-rank" style={{ background: '#E85D1F' }}>1</span><span className="out-addr">서교동 367-12</span><span className="mono">88점</span></div>
              <div className="out-item"><span className="out-rank" style={{ background: '#F4B431' }}>2</span><span className="out-addr">동교동 154-8</span><span className="mono">82점</span></div>
              <div className="out-item"><span className="out-rank" style={{ background: '#0FB5A6' }}>3</span><span className="out-addr">서교동 401-3</span><span className="mono">77점</span></div>
            </div>
          </div>
        </div>

        <div className="algo-detail">
          <div className="ad-card">
            <div className="ad-head">
              <span className="ad-step">무엇을 보나요?</span>
              <h3>4가지 관점으로 자리를 살펴봐요</h3>
            </div>
            <div className="ad-factors">
              <div className="ad-factor">
                <div className="ad-factor-ico" style={{ background: '#FEE6D5', color: '#E85D1F' }}><Icon name="activity" size={18} /></div>
                <div><b>얼마나 많은 사람이 다니는지</b><p>시간대별 유동인구를 반영해요</p></div>
              </div>
              <div className="ad-factor">
                <div className="ad-factor-ico" style={{ background: '#DCE6FA', color: '#3B6FE8' }}><Icon name="building" size={18} /></div>
                <div><b>근처에 같은 업종이 몇 곳 있는지</b><p>마커 주변 경쟁 밀도를 체크해요</p></div>
              </div>
              <div className="ad-factor">
                <div className="ad-factor-ico" style={{ background: 'rgba(244,180,49,.14)', color: '#D98A00' }}><Icon name="trending" size={18} /></div>
                <div><b>그 자리에서 기대되는 매출</b><p>비슷한 조건의 기존 가게 실적을 참고해요</p></div>
              </div>
              <div className="ad-factor">
                <div className="ad-factor-ico" style={{ background: '#D5F3EF', color: '#0A9486' }}><Icon name="sparkles" size={18} /></div>
                <div><b>동네 상권이 성장 중인지</b><p>최근 몇 년간의 업종 변화 흐름을 봐요</p></div>
              </div>
            </div>
          </div>

          <div className="ad-card dark">
            <div className="ad-head">
              <span className="ad-step dark">결과</span>
              <h3>0~100점으로 한눈에</h3>
            </div>
            <p>
              4가지를 종합해서 공실매물마다 <b>입지 점수</b>를 매겨드려요. 점수가 높을수록 그 업종으로 창업했을 때 자리 잡기 좋은 입지라는 뜻이에요.
            </p>
            <div className="ad-score-demo">
              <div className="ad-score-row"><span className="ad-sr-lab">서교동 367-12</span><div className="ad-sr-bar"><span style={{ width: '88%' }} /></div><b className="num">88</b></div>
              <div className="ad-score-row"><span className="ad-sr-lab">동교동 154-8</span><div className="ad-sr-bar"><span style={{ width: '82%', background: '#F4B431' }} /></div><b className="num">82</b></div>
              <div className="ad-score-row"><span className="ad-sr-lab">서교동 401-3</span><div className="ad-sr-bar"><span style={{ width: '77%', background: '#0FB5A6' }} /></div><b className="num">77</b></div>
            </div>
            <div className="ad-meta mono">분석은 보통 몇 초면 끝나요</div>
          </div>
        </div>
      </div>
    </section>
  );
}
