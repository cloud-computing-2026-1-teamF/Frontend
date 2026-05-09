import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './history.css';
import { Icon } from '../../shared/Icon';
import { Footer } from '../../shared/Nav';
import type { SavedAnalysis } from '../../lib/savedAnalyses';
import { api } from '../../api';
import { USE_MOCK } from '../../api/client';
import {
  type AnalysisSession,
  listAnalysisSessions,
  patchAnalysisSessionStatus,
  removeAnalysisSession,
  sessionToSavedAnalysis,
} from '../../features/analysisSessions/store';

const AVG_FOOT = 7500;
const AVG_COMP = 5;

type HistoryItem = SavedAnalysis & {
  title: string;
  tags: { key: string; dir: 'up' | 'down' }[];
  backendStatus?: AnalysisSession['status'];
  backendProgress?: number;
};

export function History() {
  const [sort, setSort] = useState<'recent' | 'score'>('recent');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<SavedAnalysis[]>([]);
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (USE_MOCK) {
      api.analyses.list({ sort, q: q || undefined })
        .then(res => { if (!cancelled) setItems(res.items); })
        .catch(() => { if (!cancelled) setItems([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }

    const localSessions = filterSessions(listAnalysisSessions(), q, sort);
    setSessions(localSessions);
    setItems(localSessions.map(sessionToSavedAnalysis));
    setLoading(false);

    Promise.all(localSessions.map(session =>
      api.analyses.poll(session.id)
        .then(status => patchAnalysisSessionStatus(session.id, status))
        .catch(() => session),
    )).then(next => {
      if (cancelled) return;
      const refreshed = next.filter(Boolean) as AnalysisSession[];
      const filtered = filterSessions(refreshed, q, sort);
      setSessions(filtered);
      setItems(filtered.map(sessionToSavedAnalysis));
    });

    return () => { cancelled = true; };
  }, [sort, q]);

  const handleDelete = async (id: number | string) => {
    if (!window.confirm('이 분석 이력을 삭제할까요?')) return;
    if (!USE_MOCK) {
      removeAnalysisSession(id);
      setSessions(prev => prev.filter(it => it.id !== String(id)));
      setItems(prev => prev.filter(it => String(it.id) !== String(id)));
      return;
    }
    try {
      await api.analyses.delete(id);
      setItems(prev => prev.filter(it => String(it.id) !== String(id)));
    } catch { /* keep current list on failure */ }
  };

  const sessionById = useMemo(() => new Map(sessions.map(session => [session.id, session])), [sessions]);

  const decorated: HistoryItem[] = useMemo(() => items.map(it => {
    const topFoot = it.top3[0].foot;
    const topComp = it.top3[0].comp;
    const session = sessionById.get(String(it.id));
    return {
      ...it,
      title: `${it.region} ${it.category} 입지 분석`,
      backendStatus: session?.status,
      backendProgress: session?.progress,
      tags: [
        session
          ? { key: statusLabel(session.status), dir: session.status === 'done' ? 'up' as const : 'down' as const }
          : { key: '유동인구', dir: topFoot >= AVG_FOOT ? 'up' as const : 'down' as const },
        session
          ? { key: `${session.progress}%`, dir: session.status === 'done' ? 'up' as const : 'down' as const }
          : { key: '경쟁밀도', dir: topComp <= AVG_COMP ? 'up' as const : 'down' as const },
      ],
    };
  }), [items, sessionById]);

  return (
    <>
      <div className="hist-page">
        <div className="container hist-container">
          <header className="hist-header">
            <div className="hist-crumb"><b>분석 이력</b></div>
            <div className="hist-title-row">
              <div>
                <h1>분석 이력</h1>
                <p>{USE_MOCK ? '지금까지 분석한 상권과 공실매물을 다시 살펴보고 비교할 수 있어요.' : '이 브라우저에서 생성한 백엔드 분석 작업을 추적하고 상세 섹션 상태를 확인해요.'}</p>
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
              {q && <button onClick={() => setQ('')}><Icon name="close" size={12} /></button>}
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

function filterSessions(sessions: AnalysisSession[], q: string, sort: 'recent' | 'score'): AnalysisSession[] {
  const keyword = q.trim();
  const filtered = keyword
    ? sessions.filter(session =>
      `${session.areaName} ${session.category} ${session.roadAddress}`.includes(keyword))
    : sessions;
  return [...filtered].sort((a, b) =>
    sort === 'score' ? b.progress - a.progress : b.createdAt.localeCompare(a.createdAt));
}

function statusLabel(status: AnalysisSession['status']) {
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
            <span><Icon name="database" size={11} /> {item.count > 0 ? `공실매물 ${item.count}개 검토` : '상세 데이터 준비 중'}</span>
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
            <div className="hc-row" key={p.addr}>
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
        <button className="btn btn-primary btn-sm" onClick={openDetail}>
          상세 보기 <Icon name="arrow-right" size={12} />
        </button>
        <button className="hc-delete-btn" title="삭제" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>
          <Icon name="trash" size={13} />
          <span>삭제</span>
        </button>
      </div>
    </div>
  );
}
