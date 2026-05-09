// Detail page — full analysis view for one history item.
// Loads via `GET /analyses/:id` (mock-routed while USE_MOCK is on).
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import './detail.css';
import { Icon } from '../../shared/Icon';
import { FactorCard, buildFactorViz } from '../../shared/FactorViz';
import { Footer } from '../../shared/Nav';
import type { SavedAnalysis } from '../../lib/savedAnalyses';
import { api } from '../../api';
import { HourlyChart } from '../../features/detail/components/HourlyChart';
import { RiskSummary } from '../../features/detail/components/RiskSummary';
import { ScoreRing } from '../../features/detail/components/ScoreRing';

export function Detail() {
  const [selected, setSelected] = useState(0);
  const { id: idParam } = useParams<{ id: string }>();

  const [item, setItem] = useState<SavedAnalysis | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'missing'>('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    // `:id` is numeric in the current mock store but the API contract treats
    // it as opaque — `api.analyses.get` accepts both `number | string`.
    const id = idParam ?? '';
    api.analyses.get(id)
      .then(res => { if (!cancelled) { setItem(res); setStatus('ok'); } })
      .catch(() => { if (!cancelled) setStatus('missing'); });
    return () => { cancelled = true; };
  }, [idParam]);

  if (status === 'loading') {
    return (
      <div className="dt-page">
        <div className="container">
          <p style={{ padding: 60, textAlign: 'center' }}>분석 이력을 불러오는 중…</p>
        </div>
      </div>
    );
  }

  if (status === 'missing' || !item) {
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

function peakHour(data: number[]): string {
  let max = 0, idx = 0;
  data.forEach((v, i) => { if (v > max) { max = v; idx = i; } });
  return String(idx).padStart(2, '0');
}
