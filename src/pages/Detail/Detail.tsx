import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import './detail.css';
import { Icon } from '../../shared/Icon';
import { FactorCard, buildFactorViz } from '../../shared/FactorViz';
import { Footer } from '../../shared/Nav';
import type { SavedAnalysis } from '../../lib/savedAnalyses';
import { api, type AnalysisPollingResponse, type AnalysisSectionTodo, type BusinessType } from '../../api';
import { USE_MOCK } from '../../api/client';
import { HISTORY_ITEMS } from '../../data/history';
import { readSavedAnalyses } from '../../lib/savedAnalyses';
import {
  buildSessionFromBackend,
  findAnalysisSession,
  patchAnalysisSessionStatus,
  patchAnalysisSessionTop3,
  sessionToSavedAnalysis,
  upsertAnalysisSession,
} from '../../features/analysisSessions/store';
import { HourlyChart } from '../../features/detail/components/HourlyChart';
import { RiskSummary } from '../../features/detail/components/RiskSummary';
import { ScoreRing } from '../../features/detail/components/ScoreRing';

export function Detail() {
  const [selected, setSelected] = useState(0);
  const { id: idParam } = useParams<{ id: string }>();

  const [item, setItem] = useState<SavedAnalysis | null>(null);
  const [sections, setSections] = useState<AnalysisSectionTodo[]>([]);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'missing'>('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setSections([]);
    setSectionError(null);
    const id = idParam ?? '';

    if (USE_MOCK) {
      const found = [...readSavedAnalyses(), ...HISTORY_ITEMS].find(row => String(row.id) === id);
      if (!found) {
        setStatus('missing');
      } else {
        setItem(found);
        setStatus('ok');
      }
      return () => { cancelled = true; };
    }

    const session = findAnalysisSession(id);

    const loadFollowUps = () => {
      api.analyses.poll(id)
        .then(nextStatus => {
          const next = patchAnalysisSessionStatus(id, nextStatus);
          if (!cancelled && next) setItem(sessionToSavedAnalysis(next));
        })
        .catch(() => { /* Keep current detail visible. */ });

      api.analyses.sections(id)
        .then(res => { if (!cancelled) setSections(res); })
        .catch(error => {
          if (!cancelled) setSectionError(error instanceof Error ? error.message : '상세 섹션을 불러오지 못했어요.');
        });

      // Refresh top3 from the authoritative source — this is the only path
      // that hydrates cross-laptop analyses (the local stub session built
      // from list summary only has a placeholder top3).
      api.analyses.recommendations(id)
        .then(res => {
          if (cancelled) return;
          const next = patchAnalysisSessionTop3(id, res.recommendations);
          if (next) setItem(sessionToSavedAnalysis(next));
        })
        .catch(() => { /* Keep whatever top3 we already have. */ });
    };

    if (session) {
      setItem(sessionToSavedAnalysis(session));
      setStatus('ok');
      loadFollowUps();
      return () => { cancelled = true };
    }

    // No local cache — analysis was created on another device or after a
    // localStorage wipe. Pull a summary row from the backend list, build a
    // stub session, persist it locally so subsequent visits on this device
    // hit the fast path, then let loadFollowUps fill in the real top3.
    Promise.all([
      api.analyses.list({ sort: 'recent', limit: 400 }).catch(() => null),
      api.catalog.listBusinessTypes().catch(() => [] as BusinessType[]),
    ]).then(([listRes, businessTypes]) => {
      if (cancelled) return;
      if (!listRes) { setStatus('missing'); return; }
      const row = listRes.items.find(it => String(it.id) === id);
      if (!row) { setStatus('missing'); return; }
      // The mock router still returns SavedAnalysis seed rows on this slot;
      // they already render fine. Real backend hands back the polling-shape
      // row, which needs stub conversion before the JSX touches it.
      if ((row as { top3?: unknown }).top3 !== undefined) {
        setItem(row as SavedAnalysis);
      } else {
        const stub = buildSessionFromBackend(row as AnalysisPollingResponse, businessTypes);
        upsertAnalysisSession(stub);
        setItem(sessionToSavedAnalysis(stub));
      }
      setStatus('ok');
      loadFollowUps();
    });

    return () => { cancelled = true };
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
                <span className="dt-chip"><Icon name="database" size={11} /> {item.count > 0 ? `공실매물 ${item.count}개 검토` : '상세 데이터 준비 중'}</span>
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
                      <span className={`dt-top3-rec ${p.recommended === false ? 'is-caution' : 'is-good'}`}>
                        {p.recommended === false ? '비추천' : '추천'}
                      </span>
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
                <span className={`dt-hero-tag ${sel.recommended === false ? 'is-caution' : 'is-good'}`}>
                  {sel.recommended === false ? '비추천' : '추천'}
                </span>
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

          {!USE_MOCK && (
            <section className="dt-section">
              <div className="dt-sec-label">
                <span className="dt-sec-num">02</span>
                <span>백엔드 상세 섹션 API</span>
              </div>
              {sectionError ? (
                <div className="dt-api-empty">
                  <Icon name="info" size={18} />
                  <div>
                    <b>섹션 API를 불러오지 못했어요</b>
                    <p>{sectionError}</p>
                  </div>
                </div>
              ) : (
                <div className="dt-api-grid">
                  {sections.map(section => (
                    <div className="dt-api-card" key={section.sectionKey}>
                      <div className="dt-api-card-head">
                        <span>{section.sectionLabel}</span>
                        <b>{section.sectionKey}</b>
                      </div>
                      <p>{section.todo}</p>
                      <time>{new Date(section.updatedAt).toLocaleString()}</time>
                    </div>
                  ))}
                  {sections.length === 0 && (
                    <div className="dt-api-empty">
                      <Icon name="database" size={18} />
                      <div>
                        <b>상세 섹션을 불러오는 중</b>
                        <p>추천 매물, 주요 지표, 유동인구, 경쟁, 매출, 성장률, 접근성 API를 확인하고 있어요.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          <section className="dt-section">
            <div className="dt-sec-label">
              <span className="dt-sec-num">{USE_MOCK ? '02' : '03'}</span>
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
              <span className="dt-sec-num">{USE_MOCK ? '03' : '04'}</span>
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
              <span className="dt-sec-num">{USE_MOCK ? '04' : '05'}</span>
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
