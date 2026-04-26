// Detail page — full analysis view for one history item
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import './detail.css';
import { Icon } from '../../shared/Icon';
import { FactorCard, buildFactorViz } from '../../shared/FactorViz';
import { Footer } from '../../shared/Nav';
import { readSavedAnalyses, type SavedAnalysis, type Top3Item } from '../../lib/savedAnalyses';
import { HISTORY_ITEMS } from '../../data/history';

export function Detail() {
  const [selected, setSelected] = useState(0);
  const { id: idParam } = useParams<{ id: string }>();
  const id = parseInt(idParam || '1', 10);

  const items: SavedAnalysis[] = [...readSavedAnalyses(), ...HISTORY_ITEMS];
  const item = items.find(it => it.id === id) || items[0];

  if (!item) {
    return (
      <div className="dt-page">
        <div className="container">
          <p style={{ padding: 60, textAlign: 'center' }}>분석 이력을 찾을 수 없어요.</p>
        </div>
      </div>
    );
  }

  const sel = item.top3[selected];
  const selRank = selected + 1;

  return (
    <>
      <div className="dt-page">
        <div className="container dt-container">
          <div className="dt-crumb">
            <Link to="/history">분석 이력</Link>
            <span>›</span>
            <b>상세 보기</b>
          </div>

          <header className="dt-header">
            <div className="dt-header-top">
              <Link to="/history" className="dt-back">
                <Icon name="chevron-left" size={14} />
                <span>목록으로</span>
              </Link>
            </div>

            <div className="dt-title-block">
              <h1>상세 보기</h1>
              <div className="dt-title-meta">
                <span className="dt-chip">
                  <Icon name="map-pin" size={11} /> {item.regionDetail || item.region}
                </span>
                {item.radius && (
                  <span className="dt-chip">반경 {item.radius}m</span>
                )}
                <span className="dt-chip">{item.categoryEmoji} {item.category}</span>
                <span className="dt-chip"><Icon name="calendar" size={11} /> {item.date} · {item.time}</span>
                <span className="dt-chip"><Icon name="database" size={11} /> 공실매물 {item.count}개 검토</span>
              </div>
              <p className="dt-budget">
                <span className="dt-budget-lab">예산 조건</span>
                <span className="dt-budget-val">{item.budget}</span>
              </p>
            </div>
          </header>

          <section className="dt-top3">
            <div className="dt-sec-label">
              <span className="dt-sec-num">01</span>
              <span>추천 공실매물 Top 3</span>
            </div>
            <div className="dt-top3-grid">
              {item.top3.map((p, i) => {
                const isSel = i === selected;
                return (
                  <button key={p.addr} className={`dt-top3-card r${i + 1} ${isSel ? 'is-sel' : ''}`}
                    onClick={() => setSelected(i)}>
                    <div className="dt-top3-head">
                      <span className={`dt-top3-rank r${i + 1}`}>TOP {i + 1}</span>
                      {isSel && <span className="dt-top3-check"><Icon name="check" size={11} stroke={3} /></span>}
                    </div>
                    <div className="dt-top3-addr">{p.addr}</div>
                    <div className="dt-top3-sub">{p.floor} · {p.area}㎡</div>
                    <div className="dt-top3-score-row">
                      <ScoreRing score={p.score} size={72} stroke={8} rank={i + 1} />
                      <div className="dt-top3-kpis">
                        <div><span>월세</span><b>{p.rent}만</b></div>
                        <div><span>보증금</span><b>{(p.deposit / 1000).toFixed(1)}천만</b></div>
                        <div><span>관리비</span><b>{p.mgmt}만</b></div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="dt-hero">
            <div className="dt-hero-left">
              <div className="dt-hero-tag-row">
                <span className={`dt-hero-rank r${selRank}`}>TOP {selRank}</span>
                <span className="dt-hero-tag">{sel.floor}</span>
                <span className="dt-hero-tag">{sel.area}㎡</span>
                <span className="dt-hero-tag">상가 · 전용</span>
              </div>
              <h2 className="dt-hero-addr">{sel.addr}</h2>
              <p className="dt-hero-sub">
                해당 공실매물의 주변 상권 · 유동인구 · 경쟁 · 매출 · 성장성 지표를 종합했어요.
              </p>

              <div className="dt-hero-kpis">
                <div className="dt-hk">
                  <div className="dt-hk-lab">월세</div>
                  <div className="dt-hk-val">{sel.rent}<span>만원</span></div>
                </div>
                <div className="dt-hk">
                  <div className="dt-hk-lab">보증금</div>
                  <div className="dt-hk-val">{(sel.deposit / 1000).toFixed(1)}<span>천만</span></div>
                </div>
                <div className="dt-hk">
                  <div className="dt-hk-lab">관리비</div>
                  <div className="dt-hk-val">{sel.mgmt}<span>만원</span></div>
                </div>
                <div className="dt-hk">
                  <div className="dt-hk-lab">추정 월매출</div>
                  <div className="dt-hk-val">{sel.rev.toLocaleString()}<span>만원</span></div>
                </div>
              </div>
            </div>
            <div className="dt-hero-right">
              <ScoreRing score={sel.score} size={180} stroke={16} rank={selRank} showLabel />
            </div>
          </section>

          <section className="dt-section">
            <div className="dt-sec-label">
              <span className="dt-sec-num">02</span>
              <span>주요 지표</span>
            </div>
            <div className="dt-factors">
              {buildFactorViz(sel).map(f => (
                <FactorCard key={f.key} {...f} />
              ))}
            </div>
          </section>

          <section className="dt-section">
            <div className="dt-sec-label">
              <span className="dt-sec-num">03</span>
              <span>유동 패턴 & 입지 접근성</span>
            </div>
            <div className="dt-grid-2">
              <div className="dt-card">
                <div className="dt-card-head">
                  <div>
                    <div className="dt-card-title">시간대별 유동인구</div>
                    <div className="dt-card-sub">반경 {item.radius || 500}m 기준 · 24시간 평균</div>
                  </div>
                  <div className="dt-card-peak">
                    Peak <b>{peakHour(sel.footHourly)}시</b>
                  </div>
                </div>
                <HourlyChart data={sel.footHourly} color="#E85D1F" />
              </div>

              <div className="dt-card">
                <div className="dt-card-head">
                  <div>
                    <div className="dt-card-title">입지 접근성</div>
                    <div className="dt-card-sub">반경 {item.radius || 500}m 주변 인프라</div>
                  </div>
                </div>
                <div className="dt-access-list">
                  <div className="dt-access-row">
                    <div className="dt-access-ico" style={{ background: 'rgba(59,111,232,.12)', color: '#3B6FE8' }}>
                      <Icon name="activity" size={14} />
                    </div>
                    <div className="dt-access-info">
                      <div className="dt-access-lab">지하철</div>
                      <div className="dt-access-val">{sel.nearby.subway}</div>
                    </div>
                  </div>
                  <div className="dt-access-row">
                    <div className="dt-access-ico" style={{ background: 'rgba(22,185,129,.12)', color: '#16B981' }}>
                      <Icon name="users" size={14} />
                    </div>
                    <div className="dt-access-info">
                      <div className="dt-access-lab">버스</div>
                      <div className="dt-access-val">{sel.nearby.bus}</div>
                    </div>
                  </div>
                  <div className="dt-access-row">
                    <div className="dt-access-ico" style={{ background: 'rgba(124,92,230,.12)', color: '#7C5CE6' }}>
                      <Icon name="building" size={14} />
                    </div>
                    <div className="dt-access-info">
                      <div className="dt-access-lab">주차</div>
                      <div className="dt-access-val">{sel.nearby.parking}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="dt-section">
            <div className="dt-sec-label">
              <span className="dt-sec-num">04</span>
              <span>종합 진단</span>
            </div>
            <RiskSummary sel={sel} selRank={selRank} />
          </section>

          <div className="dt-foot-cta">
            <Link to="/analyze" className="btn btn-secondary">
              <Icon name="map-pin" size={14} /> 새 지역 분석하기
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

function ScoreRing({ score, size = 160, stroke = 14, rank = 1, showLabel = false }: {
  score: number; size?: number; stroke?: number; rank?: number; showLabel?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(score / 100, 1);
  const trackDash = c * 0.78;
  const dash = trackDash * pct;
  const colors: Record<number, string> = { 1: '#E85D1F', 2: '#F4B431', 3: '#3B6FE8' };
  const color = colors[rank] || '#E85D1F';
  return (
    <div className="dt-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="#EEF1F7" strokeWidth={stroke}
          strokeDasharray={`${trackDash} ${c}`} strokeLinecap="round"
          transform={`rotate(130 ${size / 2} ${size / 2})`} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          transform={`rotate(130 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="dt-ring-center">
        <div className="dt-ring-val" style={{ color, fontSize: size * 0.28 }}>
          {score}<span style={{ fontSize: size * 0.13 }}>%</span>
        </div>
        {showLabel && <div className="dt-ring-lab">생존율</div>}
      </div>
    </div>
  );
}

function HourlyChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  return (
    <div className="dt-hourly">
      <div className="dt-hourly-bars">
        {data.map((v, i) => (
          <div key={i} className="dt-hourly-bar-wrap">
            <div className="dt-hourly-bar" style={{ height: `${(v / max) * 100}%`, background: color }} />
          </div>
        ))}
      </div>
      <div className="dt-hourly-axis">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
    </div>
  );
}

function peakHour(data: number[]): string {
  let max = 0, idx = 0;
  data.forEach((v, i) => { if (v > max) { max = v; idx = i; } });
  return String(idx).padStart(2, '0');
}

function RiskSummary({ sel, selRank }: { sel: Top3Item; selRank: number }) {
  const REFS = { foot: 7500, comp: 5, rev: 1500, growth: 5 };
  const footDiff = Math.round((sel.foot - REFS.foot) / REFS.foot * 100);
  const revDiff = Math.round((sel.rev - REFS.rev) / REFS.rev * 100);
  const compGap = sel.comp - REFS.comp;
  const growthGap = sel.growth - REFS.growth;

  type Tone = 'up' | 'down';
  const factors: { lab: string; tone: Tone; headline: string; score: number }[] = [
    {
      lab: '유동인구',
      tone: footDiff >= 0 ? 'up' : 'down',
      headline: footDiff >= 0 ? `업종 평균보다 ${footDiff}% 많아요` : `업종 평균보다 ${Math.abs(footDiff)}% 적어요`,
      score: footDiff >= 10 ? 1 : footDiff >= -10 ? 0 : -1,
    },
    {
      lab: '경쟁 밀도',
      tone: compGap <= 0 ? 'up' : 'down',
      headline: compGap <= 0
        ? `분석 반경 내 ${sel.comp}곳으로 적정 수준이에요`
        : `분석 반경 내 ${sel.comp}곳으로 다소 밀집돼 있어요`,
      score: compGap <= 0 ? 1 : compGap <= 2 ? 0 : -1,
    },
    {
      lab: '추정 매출',
      tone: revDiff >= 0 ? 'up' : 'down',
      headline: revDiff >= 0
        ? `업종 평균 대비 +${revDiff}% 수준의 매출이 예상돼요`
        : `업종 평균 대비 ${revDiff}% 낮은 매출이 예상돼요`,
      score: revDiff >= 10 ? 1 : revDiff >= -10 ? 0 : -1,
    },
    {
      lab: '업종 성장률',
      tone: growthGap >= 0 ? 'up' : 'down',
      headline: growthGap >= 0
        ? `전년 대비 +${sel.growth}% 성장하는 흐름이에요`
        : `전년 대비 +${sel.growth}%로 성장세가 둔화됐어요`,
      score: sel.growth >= 8 ? 1 : sel.growth >= 3 ? 0 : -1,
    },
  ];

  const totalScore = factors.reduce((s, f) => s + f.score, 0);
  const level: 'low' | 'medium' | 'high' =
    totalScore >= 2 ? 'low' : totalScore >= 0 ? 'medium' : 'high';
  const title =
    level === 'low'    ? '전반적으로 안정적인 입지예요' :
    level === 'medium' ? '일부 주의할 요소가 있어요' :
                         '리스크 요소가 많으니 신중하게 검토하세요';

  return (
    <div className={`dt-risk dt-risk-${level}`}>
      <div className="dt-risk-head">
        <div className={`dt-risk-badge dt-risk-badge-${level}`}>
          {level === 'low' ? '낮음' : level === 'medium' ? '보통' : '높음'}
        </div>
        <div>
          <div className="dt-risk-title">{title}</div>
          <div className="dt-risk-sub">생존율 {sel.score}% · Top {selRank} 공실매물 기준 · 주요 지표 4개 요약</div>
        </div>
      </div>
      <ul className="dt-risk-list">
        {factors.map((f, i) => (
          <li key={i} className={`dt-risk-item tone-${f.tone}`}>
            <span className={`dt-risk-bullet tone-${f.tone}`} />
            <div className="dt-risk-item-body">
              <span className="dt-risk-item-lab">{f.lab}</span>
              <span className="dt-risk-item-headline">{f.headline}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
