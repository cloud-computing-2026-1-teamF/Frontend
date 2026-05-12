import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../shared/Icon';
import { useAuth } from '../../auth/AuthContext';

// Mirrors GET /v1/business-types — the same 9 categories the real
// /analyze page offers. Keep the order/keys consistent with the backend.
const TYPES = [
  { key: '1', label: '🍚 한식',              icon: 'building' },
  { key: '9', label: '☕ 카페/디저트',       icon: 'coffee' },
  { key: '7', label: '🍔 패스트푸드',        icon: 'zap' },
  { key: '8', label: '🍻 주점업',            icon: 'activity' },
  { key: '3', label: '🍣 일식',              icon: 'layers' },
  { key: '4', label: '🍝 서양식',            icon: 'cpu' },
  { key: '2', label: '🥟 중식',              icon: 'map-pin' },
  { key: '6', label: '🥘 구내식당 및 뷔페',  icon: 'layers' },
  { key: '5', label: '🍽️ 기타',              icon: 'sparkles' },
];

export function Hero() {
  const [businessType, setBusinessType] = useState('9'); // 카페/디저트 (matches backend key)
  const [dong, setDong] = useState('');
  const { user, openAuth } = useAuth();
  const navigate = useNavigate();

  const handleAnalyze = (e: MouseEvent) => {
    e.preventDefault();
    if (!user) openAuth('login');
    else navigate('/analyze');
  };

  return (
    <section className="hero" style={{ fontFamily: 'Pretendard' }}>
      <div className="container hero-inner">
        <div className="hero-left">
          <div className="hero-badge">
            <span>🗺️ 서울 요식업 창업자를 위한 입지 추천</span>
          </div>
          <h1 className="hero-title">
            서울 어느 골목에<br />
            열어야 <span className="hero-accent">살아남을까?</span>
          </h1>
          <p className="hero-sub">
            서울 전역의 상권 데이터와 실제 공실매물을 <b>지도 위에서</b> 한 번에 살펴보세요.<br />
            업종 하나 고르고 <b>지도에 위치만 찍으면</b>, 마커 주변 상권에서<br />
            생존율 높은 <b>Top 3 공실매물</b>을 바로 찾아드립니다.
          </p>

          <div className="hero-search">
            <div className="hs-row">
              <label className="hs-label mono">희망 업종</label>
              <div className="hs-chips">
                {TYPES.map(t => (
                  <button key={t.key}
                    className={`hs-chip ${businessType === t.key ? 'is-on' : ''}`}
                    onClick={() => setBusinessType(t.key)}>
                    <Icon name={t.icon} size={14} />{t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="hs-row">
              <label className="hs-label mono">분석 위치</label>
              <div className="hs-input">
                <Icon name="map-pin" size={16} />
                <input value={dong} onChange={e => setDong(e.target.value)} placeholder="지도에서 마커로 찍어 분석" />
                <a href="/analyze" className="btn btn-primary btn-sm" onClick={handleAnalyze}>
                  <Icon name="sparkles" size={14} />분석
                </a>
              </div>
            </div>
          </div>

          <div className="hero-stats">
            <div className="hs-stat">
              <div className="hs-num num">60<span>%</span></div>
              <div className="hs-lab">요식업 5년 내 폐업률<br /><span>(국내 평균)</span></div>
            </div>
            <div className="hs-stat">
              <div className="hs-num num">9<span>종</span></div>
              <div className="hs-lab">지원 요식업 업종<br /><span>(한식·카페·패스트푸드 등)</span></div>
            </div>
            <div className="hs-stat">
              <div className="hs-num num">424<span>개</span></div>
              <div className="hs-lab">서울 분석 행정동<br /><span>(전 자치구 커버)</span></div>
            </div>
            <div className="hs-stat">
              <div className="hs-num num">Top 3</div>
              <div className="hs-lab">공실매물 추천<br /><span>(생존율 높은 순)</span></div>
            </div>
          </div>
        </div>

        <HeroVisual />
      </div>

      <div className="hero-ticker">
        <div className="ticker-track">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="ticker-inner">
              <span className="tk"><b>LIVE</b> ☕ 홍대입구동 카페/디저트 생존율 <span className="tk-up num">88<i>%</i></span></span>
              <span className="tk-sep" />
              <span className="tk">🍚 연남동 한식 <span className="tk-up num">77<i>%</i></span></span>
              <span className="tk-sep" />
              <span className="tk">🍔 신림동 패스트푸드 <span className="tk-down num">54<i>%</i></span></span>
              <span className="tk-sep" />
              <span className="tk">🍝 성수2가동 서양식 <span className="tk-up num">82<i>%</i></span></span>
              <span className="tk-sep" />
              <span className="tk">🍻 이태원1동 주점업 <span className="tk-down num">43<i>%</i></span></span>
              <span className="tk-sep" />
              <span className="tk">🍣 역삼1동 일식 <span className="tk-up num">71<i>%</i></span></span>
              <span className="tk-sep" />
              <span className="tk">🥟 명동 중식 <span className="tk-up num">75<i>%</i></span></span>
              <span className="tk-sep" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroVisual() {
  const [activeIdx, setActiveIdx] = useState(0);
  const dongs = ['홍대입구동', '연남동', '성수2가동'];
  useEffect(() => {
    const t = setInterval(() => setActiveIdx(i => (i + 1) % 3), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="hero-visual">
      <div className="hv-seoul-bg">
        {['마포구', '성동구', '강남구', '용산구', '서대문구', '중구'].map((g, i) => (
          <span key={g} className="hv-gu" style={{
            animationDelay: `${i * 0.4}s`,
            top: `${18 + (i % 3) * 28}%`,
            left: `${8 + (i % 2) * 48}%`,
          }}>{g}</span>
        ))}
      </div>

      <div className="hv-window">
        <div className="hv-bar">
          <div className="hv-dots"><i /><i /><i /></div>
          <div className="hv-url mono">상권AI · {dongs[activeIdx]} · ☕ 카페</div>
          <div className="hv-live mono"><span className="pulse" />LIVE</div>
        </div>
        <div className="hv-body">
          <div className="hv-map"><HeroMap /></div>
          <div className="hv-side">
            <div className="hv-side-head">
              <div className="eyebrow">추천 · Top 3</div>
              <div className="hv-chip">☕ 홍대입구동</div>
            </div>
            {[
              { rank: 1, addr: '서교동 367-12', score: 88, rent: '280', label: '카페', color: '#E85D1F' },
              { rank: 2, addr: '동교동 154-8',  score: 82, rent: '245', label: '카페', color: '#F4B431' },
              { rank: 3, addr: '서교동 401-3',  score: 77, rent: '210', label: '카페', color: '#0FB5A6' },
            ].map(p => (
              <div key={p.rank} className="hv-card">
                <div className="hv-rank" style={{ background: p.color }}>{p.rank}</div>
                <div className="hv-info">
                  <div className="hv-addr">{p.addr}</div>
                  <div className="hv-meta mono">{p.label} · 월세 {p.rent}만 · 1F</div>
                </div>
                <div className="hv-score">
                  <div className="hv-score-num num">{p.score}</div>
                  <div className="hv-score-lab">생존율</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hv-foot mono">
          <span><i className="dot-green" />유동인구 9,200/일</span>
          <span><i className="dot-amber" />동종 경쟁 3곳</span>
          <span><i className="dot-blue" />성장률 +12%</span>
        </div>
      </div>

      <div className="hv-float hv-float-a">
        <div className="hvf-lab mono">요식업 평균 폐업률</div>
        <div className="hvf-num num" style={{ color: '#E85D1F' }}>60<span>%</span></div>
        <div className="hvf-sub mono">5년 이내 · 서울 기준</div>
      </div>
      <div className="hv-float hv-float-b">
        <div className="hvf-lab mono">예측 정확도</div>
        <div className="hvf-num num">89<span>%</span></div>
        <div className="hvf-bar"><span style={{ width: '89%' }} /></div>
      </div>
    </div>
  );
}

export function HeroMap() {
  return (
    <svg viewBox="0 0 400 320" className="hv-map-svg">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0v20" fill="none" stroke="#E3E7F0" strokeWidth="1" />
        </pattern>
        <radialGradient id="heat1"><stop offset="0%" stopColor="#E85D1F" stopOpacity="0.55" /><stop offset="100%" stopColor="#E85D1F" stopOpacity="0" /></radialGradient>
        <radialGradient id="heat2"><stop offset="0%" stopColor="#F4B431" stopOpacity="0.4" /><stop offset="100%" stopColor="#F4B431" stopOpacity="0" /></radialGradient>
        <radialGradient id="heat3"><stop offset="0%" stopColor="#3B6FE8" stopOpacity="0.3" /><stop offset="100%" stopColor="#3B6FE8" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="400" height="320" fill="#F4F6FB" />
      <rect width="400" height="320" fill="url(#grid)" />
      <path d="M0 180 Q120 160 200 170 T400 150" stroke="#CBD2E0" strokeWidth="14" fill="none" />
      <path d="M180 0 Q200 140 220 180 T260 320" stroke="#CBD2E0" strokeWidth="10" fill="none" />
      <path d="M0 80 L400 100" stroke="#DDE2EE" strokeWidth="6" fill="none" />
      <rect x="40" y="30" width="80" height="50" rx="6" fill="#fff" stroke="#E3E7F0" />
      <rect x="280" y="40" width="90" height="40" rx="6" fill="#fff" stroke="#E3E7F0" />
      <rect x="30" y="220" width="110" height="70" rx="6" fill="#fff" stroke="#E3E7F0" />
      <rect x="270" y="230" width="100" height="60" rx="6" fill="#fff" stroke="#E3E7F0" />
      <circle cx="200" cy="170" r="110" fill="url(#heat1)" />
      <circle cx="130" cy="120" r="80" fill="url(#heat2)" />
      <circle cx="290" cy="200" r="70" fill="url(#heat3)" />
      <g className="pin" style={{ animationDelay: '0s' }}>
        <circle cx="200" cy="170" r="22" fill="#E85D1F" />
        <text x="200" y="175" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">1</text>
        <circle cx="200" cy="170" r="22" fill="none" stroke="#E85D1F" strokeOpacity="0.4" strokeWidth="2" className="ping" />
      </g>
      <g className="pin" style={{ animationDelay: '.3s' }}>
        <circle cx="135" cy="130" r="18" fill="#F4B431" />
        <text x="135" y="135" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">2</text>
      </g>
      <g className="pin" style={{ animationDelay: '.6s' }}>
        <circle cx="295" cy="205" r="18" fill="#0FB5A6" />
        <text x="295" y="210" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">3</text>
      </g>
      <g transform="translate(220, 110)">
        <rect width="140" height="44" rx="6" fill="#0A0E1A" />
        <text x="12" y="18" fill="#fff" fontSize="10" fontFamily="Pretendard" fontWeight="500">서교동 367-12</text>
        <text x="12" y="34" fill="#F26B2E" fontSize="12" fontWeight="700">생존율 88</text>
        <text x="54" y="34" fill="#9AA3BD" fontSize="10">· 1F · 33m²</text>
        <path d="M18 44 L22 52 L26 44 Z" fill="#0A0E1A" />
      </g>
    </svg>
  );
}
