import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import './detail.css';
import { Icon } from '../../shared/Icon';
import { FactorCard, buildFactorViz } from '../../shared/FactorViz';
import { Footer } from '../../shared/Nav';
import type { SavedAnalysis } from '../../lib/savedAnalyses';
import { api, type AnalysisPollingResponse, type BusinessType } from '../../api';
import { USE_MOCK, BASE_URL, getAccessToken } from '../../api/client';
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
import { useVacancyMetricReference } from '../../features/vacancies/useVacancyMetricReference';

export function Detail() {
  const [selected, setSelected] = useState(0);
  const [reportLoading, setReportLoading] = useState(false);
  // 보고서 PDF 버튼 상태: 생성 완료(success)면 초록 체크, 실패(error)면 빨강 X 를 버튼 왼쪽에 표시.
  const [reportStatus, setReportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { id: idParam } = useParams<{ id: string }>();

  const [item, setItem] = useState<SavedAnalysis | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'missing'>('loading');
  const selectedItem = item?.top3[selected] ?? null;
  const { data: metricReference } = useVacancyMetricReference(item?.businessTypeKey, selectedItem?.vacancyId);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
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

  const handleReport = async () => {
    // 라이브: 백엔드가 OpenAI로 보고서 PDF를 생성(POST /analyses/{id}/report) → 파일로 다운로드.
    // mock 또는 생성 실패 시: 사전 생성 샘플 PDF 다운로드로 폴백.
    setReportLoading(true);
    setReportStatus('idle'); // 재요청 시 이전 체크/X 초기화
    const sampleUrl = `${import.meta.env.BASE_URL}uploads/sample-report.pdf`;
    const filename = `상권분석보고서-${idParam ?? 'report'}.pdf`;
    const triggerDownload = (href: string) => {
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    try {
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 600)); // 생성되는 듯한 연출
        triggerDownload(sampleUrl);
        setReportStatus('success');
        return;
      }
      const res = await fetch(`${BASE_URL}/analyses/${idParam}/report`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
      });
      if (!res.ok) throw new Error(`report ${res.status}`);
      const blob = await res.blob();
      // 잘린/깨진 PDF 방어: 헤더 %PDF- + 꼬리 %%EOF 확인. 타임아웃 마진 경계에서 본문이 잘리면 여기서 실패 처리.
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const decoder = new TextDecoder('latin1');
      const head = decoder.decode(bytes.slice(0, 5));
      const tail = decoder.decode(bytes.slice(-1024));
      if (head !== '%PDF-' || !tail.includes('%%EOF')) throw new Error('손상된 PDF(응답 잘림)');
      const url = URL.createObjectURL(blob);
      triggerDownload(url);
      setReportStatus('success'); // 정상 생성 → 초록 체크
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      console.warn('보고서 생성 실패 — 샘플로 폴백:', err);
      triggerDownload(sampleUrl);
      setReportStatus('error'); // 실패 → 빨강 X
    } finally {
      setReportLoading(false);
    }
  };

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
              <div className="dt-header-actions">
                {reportStatus === 'success' && (
                  <span className="dt-report-status ok" role="status" title="보고서 생성 완료">
                    <Icon name="check" size={15} />
                  </span>
                )}
                {reportStatus === 'error' && (
                  <span className="dt-report-status err" role="status" title="생성 실패 — 다시 시도해 주세요">
                    <Icon name="close" size={15} />
                  </span>
                )}
                <button
                  className={`dt-report-btn${reportLoading ? ' is-loading' : ''}`}
                  onClick={handleReport}
                  disabled={reportLoading}
                >
                  <span className="dt-report-btn-ic"><Icon name="sparkles" size={18} /></span>
                  {reportLoading ? (
                    <span className="dt-report-btn-text">
                      <span className="dt-report-btn-main">AI가 보고서 작성 중…</span>
                      <span className="dt-report-btn-sub">약 1분 소요</span>
                    </span>
                  ) : (
                    <span className="dt-report-btn-text">
                      <span className="dt-report-btn-main">AI 입지 분석 보고서</span>
                      <span className="dt-report-btn-sub">PDF 다운로드 · GPT 생성</span>
                    </span>
                  )}
                </button>
              </div>
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
                <span className="dt-chip"><Icon name="database" size={11} /> {item.count > 0 ? `공실매물 ${item.count}개 검토` : '검토 수 집계 전'}</span>
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
                해당 공실매물의 주변 상권 · 유동인구 · 경쟁 · 매출 지표를 종합했어요.
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
                  <div className="dt-hk-lab">동네 평균 추정 매출</div>
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
              {buildFactorViz(sel, metricReference).map(f => (
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
            <RiskSummary sel={sel} selRank={selRank} metricReference={metricReference} />
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
