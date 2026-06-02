import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './history.css';
import { Icon } from '../../shared/Icon';
import { Footer } from '../../shared/Nav';
import type { SavedAnalysis } from '../../lib/savedAnalyses';
import type {
  AnalysisListItem,
  AnalysisPollingResponse,
  BusinessType,
} from '../../api/types';
import { api } from '../../api';
import { USE_MOCK } from '../../api/client';
import {
  type AnalysisSession,
  applyRecommendationsToSession,
  buildSessionFromBackend,
  listAnalysisSessions,
  removeAnalysisSession,
  sessionToSavedAnalysis,
  upsertAnalysisSession,
} from '../../features/analysisSessions/store';

const AVG_FOOT = 7500;
const AVG_COMP = 5;

type HistoryItem = SavedAnalysis & {
  title: string;
  tags: { key: string; dir: 'up' | 'down' }[];
  backendStatus?: AnalysisPollingResponse['status'];
  backendProgress?: number;
};

export function History() {
  const [sort, setSort] = useState<'recent' | 'score'>('recent');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<SavedAnalysis[]>([]);
  const [pollById, setPollById] = useState<Map<string, AnalysisPollingResponse>>(() => new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (USE_MOCK) {
      setPollById(new Map());
      api.analyses.list({ sort, q: q || undefined, saved: true })
        .then(res => { if (!cancelled) setItems(res.items as SavedAnalysis[]); })
        .catch(() => { if (!cancelled) setItems([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true };
    }

    // 캐시에 '이미 정상인'(실제 top3 보유) 카드는 즉시 보여준다. 단, 점수만 담긴
    // placeholder(아직 추천이 없는)는 깨진 모습이 보이지 않도록 초기 렌더에서 제외하고,
    // 백엔드 목록 + 하이드레이션이 끝난 뒤 완전한 목록으로 교체한다. 보여줄 게 하나도
    // 없으면 loading 스켈레톤(공실 탐색 진입 시와 동일한 '불러오는 중')을 띄운다.
    const localSessions = filterSessions(listAnalysisSessions().filter(session => session.saved), q, sort);
    const readyLocalSessions = localSessions.filter(session => !sessionNeedsTop3(session));
    setItems(readyLocalSessions.map(sessionToSavedAnalysis));
    setPollById(new Map());
    setLoading(readyLocalSessions.length === 0);

    Promise.all([
      api.analyses.list({ sort, q: q || undefined, saved: true, limit: 200 }).catch(() => null),
      api.catalog.listBusinessTypes().catch(() => [] as BusinessType[]),
    ]).then(async ([backendList, businessTypes]) => {
      if (cancelled) return;

      if (!backendList) {
        setItems(localSessions.map(sessionToSavedAnalysis));
        const polls = await Promise.all(
          localSessions.map(s => api.analyses.poll(s.id).catch(() => null)),
        );
        if (cancelled) return;
        const nextMap = new Map<string, AnalysisPollingResponse>();
        localSessions.forEach((session, i) => {
          const p = polls[i];
          if (p) nextMap.set(String(session.id), p);
        });
        setPollById(nextMap);
        setLoading(false);
        return;
      }

      const cachedById = new Map(listAnalysisSessions().map(s => [s.id, s]));

      let mergedSessions = backendList.items.map(item =>
        listItemToSession(item, businessTypes, cachedById),
      );

      // 목록 API(GET /analyses)는 추천 매물 배열을 주지 않는다. 로컬 캐시에 실제
      // top3가 없는 분석(다른 기기/캐시 초기화/방금 생성 등)은 점수만 담긴
      // placeholder로 만들어지므로, 렌더 전에 추천 엔드포인트를 병렬 호출해
      // top3와 지역명까지 모두 채워 넣는다. → 깨진 카드가 노출되지 않는다.
      const needTop3 = mergedSessions.filter(sessionNeedsTop3);
      if (needTop3.length > 0) {
        const recLists = await Promise.all(
          needTop3.map(s =>
            api.analyses.recommendations(s.id).then(r => r.recommendations).catch(() => null),
          ),
        );
        if (cancelled) return;
        const hydratedById = new Map<string, AnalysisSession>();
        needTop3.forEach((session, i) => {
          const recs = recLists[i];
          if (recs && recs.length > 0) {
            hydratedById.set(String(session.id), applyRecommendationsToSession(session, recs));
          }
        });
        mergedSessions = mergedSessions.map(s => hydratedById.get(String(s.id)) ?? s);
      }

      mergedSessions.forEach(upsertAnalysisSession);

      const filtered = filterSessions(mergedSessions, q, sort);
      setItems(filtered.map(sessionToSavedAnalysis));
      setLoading(false);

      const polls = await Promise.all(
        filtered.map(s => api.analyses.poll(s.id).catch(() => null)),
      );
      if (cancelled) return;
      const nextMap = new Map<string, AnalysisPollingResponse>();
      filtered.forEach((session, i) => {
        const p = polls[i];
        if (p) nextMap.set(String(session.id), p);
      });
      setPollById(nextMap);
    });

    return () => { cancelled = true };
  }, [sort, q]);

  const handleDelete = async (id: number | string) => {
    if (!window.confirm('이 분석 이력을 삭제할까요?')) return;
    const sid = String(id);
    if (USE_MOCK) {
      try {
        await api.analyses.delete(id);
        setItems(prev => prev.filter(it => String(it.id) !== sid));
      } catch { /* keep list */ }
      return;
    }
    try {
      await api.analyses.delete(id);
      removeAnalysisSession(id);
      setItems(prev => prev.filter(it => String(it.id) !== sid));
      setPollById(prev => {
        const n = new Map(prev);
        n.delete(sid);
        return n;
      });
    } catch { /* keep list */ }
  };

  const decorated: HistoryItem[] = useMemo(() => items.map(it => {
    const topFoot = it.top3[0].foot;
    const topComp = it.top3[0].comp;
    const poll = pollById.get(String(it.id));
    return {
      ...it,
      title: `${it.region} ${it.category} 입지 분석`,
      backendStatus: poll?.status,
      backendProgress: poll?.progress,
      tags: [
        poll
          ? { key: statusLabel(poll.status), dir: poll.status === 'done' ? 'up' as const : 'down' as const }
          : { key: '유동인구', dir: topFoot >= AVG_FOOT ? 'up' as const : 'down' as const },
        poll
          ? { key: `${poll.progress}%`, dir: poll.status === 'done' ? 'up' as const : 'down' as const }
          : { key: '경쟁밀도', dir: topComp <= AVG_COMP ? 'up' as const : 'down' as const },
      ],
    };
  }), [items, pollById]);

  return (
    <>
      <div className="hist-page">
        <div className="container hist-container">
          <header className="hist-header">
            <div className="hist-crumb"><b>분석 이력</b></div>
            <div className="hist-title-row">
              <div>
                <h1>분석 이력</h1>
                <p>{USE_MOCK ? '지금까지 분석한 상권과 공실매물을 다시 살펴보고 비교할 수 있어요.' : '진행 중인 분석부터 완료된 추천 결과까지 한곳에서 다시 확인할 수 있어요.'}</p>
              </div>
              <Link to="/analyze" className="btn btn-primary">
                <Icon name="plus" size={14} />
                새 분석 시작
              </Link>
            </div>
          </header>

          <div className="hist-toolbar">
            <div className="hist-search">
              <Icon name="search" size={15} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="상권 / 업종 / 지역으로 검색" />
              {q && <button type="button" onClick={() => setQ('')}><Icon name="close" size={12} /></button>}
            </div>
            <div className="hist-sort">
              <span>정렬</span>
              <select value={sort} onChange={e => setSort(e.target.value as 'recent' | 'score')}>
                <option value="recent">최근 분석 순</option>
                <option value="score">생존율 높은 순</option>
              </select>
            </div>
          </div>

          <div className="hist-list">
            {loading && <HistoryLoadingState />}
            {!loading && decorated.length === 0 && (
              <div className="hist-empty">
                <Icon name="search" size={32} />
                <h3>일치하는 이력이 없어요</h3>
                <p>다른 키워드로 검색하거나 필터를 바꿔보세요.</p>
                {!USE_MOCK && (
                  <Link to="/analyze" className="btn btn-primary hist-empty-action">
                    새 분석 시작
                  </Link>
                )}
              </div>
            )}
            {decorated.map(it => (
              <HistoryCard key={it.id} item={it} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

function HistoryLoadingState() {
  return (
    <div className="hist-loading" aria-label="분석 이력을 불러오는 중">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="hist-loading-card" key={index}>
          <span />
          <div>
            <b />
            <em />
            <i />
          </div>
          <strong />
        </div>
      ))}
    </div>
  );
}

function isSavedAnalysisRow(item: AnalysisListItem): item is SavedAnalysis {
  return 'region' in item && 'top3' in item && Array.isArray((item as SavedAnalysis).top3);
}

// 실제 추천(vacancyId 보유)이 없는 세션 = 목록 요약만으로 만든 placeholder.
// 이런 카드는 추천 엔드포인트로 top3를 다시 받아와야 한다.
function sessionNeedsTop3(session: AnalysisSession): boolean {
  const top3 = session.top3;
  return !top3 || top3.length === 0 || !top3[0].vacancyId;
}

function savedAnalysisRowToSession(row: SavedAnalysis): AnalysisSession {
  return {
    id: String(row.id),
    createdAt: `${row.date}T${row.time}:00.000Z`,
    completedAt: null,
    status: 'done',
    progress: 100,
    stepLabel: null,
    businessType: 'korean',
    category: row.category,
    categoryEmoji: row.categoryEmoji,
    areaId: '',
    areaName: row.region,
    region: row.region,
    roadAddress: row.regionDetail ?? '',
    lat: row.centerLat ?? 0,
    lng: row.centerLng ?? 0,
    radius: row.radius ?? 500,
    analyzedVacancyCount: row.count,
    saved: row.saved,
    budget: undefined,
    top3: row.top3,
    error: null,
  };
}

function listItemToSession(
  item: AnalysisListItem,
  businessTypes: BusinessType[],
  cachedById: Map<string, AnalysisSession>,
): AnalysisSession {
  const id = String(item.id);
  const cached = cachedById.get(id);
  if (isSavedAnalysisRow(item)) {
    return savedAnalysisRowToSession(item);
  }
  if (cached) return mergeBackendSummaryIntoSession(cached, item as AnalysisPollingResponse);
  return buildSessionFromBackend(item as AnalysisPollingResponse, businessTypes);
}

function mergeBackendSummaryIntoSession(
  session: AnalysisSession,
  item: AnalysisPollingResponse,
): AnalysisSession {
  // 서버에 저장된 지역명이 있으면 그것을 권위 있는 값으로 사용해 모든 기기가
  // 동일하게 표기되도록 한다. (구버전 분석은 region이 없어 캐시 값을 유지)
  const region = item.region ?? session.areaName;
  return {
    ...session,
    areaName: region,
    region: item.region ?? session.region,
    status: item.status,
    progress: item.progress,
    stepLabel: item.step?.label ?? session.stepLabel ?? null,
    completedAt: item.completedAt ?? session.completedAt ?? null,
    analyzedVacancyCount: item.analyzedVacancyCount ?? session.analyzedVacancyCount ?? null,
    saved: item.saved ?? session.saved ?? false,
    error: item.error,
  };
}

function filterSessions(sessions: AnalysisSession[], keywordRaw: string, sort: 'recent' | 'score'): AnalysisSession[] {
  const keyword = keywordRaw.trim();
  const filtered = keyword
    ? sessions.filter(session =>
      `${session.areaName} ${session.category} ${session.roadAddress}`.includes(keyword))
    : sessions;
  return [...filtered].sort((a, b) =>
    sort === 'score' ? b.progress - a.progress : b.createdAt.localeCompare(a.createdAt));
}

function statusLabel(status: AnalysisPollingResponse['status']) {
  return {
    pending: '대기 중',
    running: '분석 중',
    done: '완료',
    failed: '실패',
  }[status];
}

function HistoryCard({ item, onDelete }: { item: HistoryItem; onDelete: (id: number | string) => void }) {
  const colors = ['#E85D1F', '#F4B431', '#3B6FE8'];
  const navigate = useNavigate();
  const openDetail = () => navigate(`/detail/${item.id}`);
  return (
    <div className="hc">
      <div className="hc-left">
        <div className="hc-date">
          <div className="hc-d-day">{item.date.slice(8)}</div>
          <div className="hc-d-mon">{item.date.slice(5, 7)}월</div>
          <div className="hc-d-time">{item.time}</div>
        </div>
        <div className="hc-main">
          <div className="hc-head"><h3>{item.title}</h3></div>
          {item.backendStatus && (
            <div className={`hc-status hc-status-${item.backendStatus}`}>
              {statusLabel(item.backendStatus)}
              {item.backendStatus !== 'done' && typeof item.backendProgress === 'number' && (
                <span>{item.backendProgress}%</span>
              )}
            </div>
          )}
          <div className="hc-meta">
            <span><Icon name="map-pin" size={11} /> {item.region}</span>
            <span><Icon name="coffee" size={11} /> {item.category}</span>
            <span><Icon name="database" size={11} /> {item.count > 0 ? `공실매물 ${item.count}개 검토` : '검토 수 집계 전'}</span>
          </div>
          <div className="hc-tags">
            {item.tags.map(t => (
              <span key={t.key} className={`hc-tag hc-tag-${t.dir}`}>
                {t.key}
                <span className="hc-tag-arrow">{t.dir === 'up' ? '↑' : '↓'}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="hc-mid">
        <div className="hc-top3-lab">추천 Top 3</div>
        <div className="hc-top3">
          {item.top3.map((p, i) => (
            <div className="hc-row" key={`${item.id}-${p.addr}-${i}`}>
              <div className="hc-rank" style={{ background: colors[i] }}>{i + 1}</div>
              <div className="hc-addr">{p.addr}</div>
              <div className="hc-score"><b className="num">{p.score}</b><span>/100</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="hc-right">
        <div className="hc-score-big">
          <div className="hc-score-num num">{item.topScore}</div>
          <div className="hc-score-lab">최고 생존율</div>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={openDetail}>
          상세 보기 <Icon name="arrow-right" size={12} />
        </button>
        <button type="button" className="hc-delete-btn" title="삭제" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>
          <Icon name="trash" size={13} />
          <span>삭제</span>
        </button>
      </div>
    </div>
  );
}
