// Analysis history list. Reads saved analyses from localStorage and merges
// the mock seed data; the user can soft-delete seed items via a hidden-ids
// list (so the demo data can be recovered by clearing that key).
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './history.css';
import { Icon } from '../../shared/Icon';
import { Footer } from '../../shared/Nav';
import { readSavedAnalyses, writeSavedAnalyses, type SavedAnalysis } from '../../lib/savedAnalyses';
import { HISTORY_ITEMS } from '../../data/history';

const HIDDEN_KEY = 'sanggwon_hidden_history_ids';

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
};
const writeJSON = (key: string, val: unknown): void => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
};

const AVG_FOOT = 7500;
const AVG_COMP = 5;

type HistoryItem = SavedAnalysis & {
  title: string;
  tags: { key: string; dir: 'up' | 'down' }[];
};

export function History() {
  const [sort, setSort] = useState<'recent' | 'score'>('recent');
  const [q, setQ] = useState('');
  const [savedItems, setSavedItems] = useState<SavedAnalysis[]>(() => readSavedAnalyses());
  const [hiddenIds, setHiddenIds] = useState<number[]>(() => readJSON<number[]>(HIDDEN_KEY, []));

  const handleDelete = (id: number) => {
    if (!window.confirm('이 분석 이력을 삭제할까요?')) return;
    const inSaved = savedItems.some(it => it.id === id);
    if (inSaved) {
      const next = savedItems.filter(it => it.id !== id);
      setSavedItems(next);
      writeSavedAnalyses(next);
    } else {
      const next = [...hiddenIds, id];
      setHiddenIds(next);
      writeJSON(HIDDEN_KEY, next);
    }
  };

  const items: HistoryItem[] = useMemo(() => {
    const merged = [...savedItems, ...HISTORY_ITEMS].filter(it => !hiddenIds.includes(it.id));
    return merged.map(it => {
      const topFoot = it.top3[0].foot;
      const topComp = it.top3[0].comp;
      return {
        ...it,
        title: `${it.region} ${it.category} 입지 분석`,
        tags: [
          { key: '유동인구', dir: topFoot >= AVG_FOOT ? 'up' as const : 'down' as const },
          { key: '경쟁밀도', dir: topComp <= AVG_COMP ? 'up' as const : 'down' as const },
        ],
      };
    });
  }, [savedItems, hiddenIds]);

  const filtered = items
    .filter(it => !q || it.title.includes(q) || it.region.includes(q) || it.category.includes(q))
    .sort((a, b) => {
      if (sort === 'score') return b.topScore - a.topScore;
      return b.date.localeCompare(a.date);
    });

  return (
    <>
      <div className="hist-page">
        <div className="container hist-container">
          <header className="hist-header">
            <div className="hist-crumb"><b>분석 이력</b></div>
            <div className="hist-title-row">
              <div>
                <h1>분석 이력</h1>
                <p>지금까지 분석한 상권과 공실매물을 다시 살펴보고 비교할 수 있어요.</p>
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
            {filtered.length === 0 && (
              <div className="hist-empty">
                <Icon name="search" size={32} />
                <h3>일치하는 이력이 없어요</h3>
                <p>다른 키워드로 검색하거나 필터를 바꿔보세요.</p>
              </div>
            )}
            {filtered.map(it => (
              <HistoryCard key={it.id} item={it} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

function HistoryCard({ item, onDelete }: { item: HistoryItem; onDelete: (id: number) => void }) {
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
          <div className="hc-meta">
            <span><Icon name="map-pin" size={11} /> {item.region}</span>
            <span><Icon name="coffee" size={11} /> {item.category}</span>
            <span><Icon name="database" size={11} /> 공실매물 {item.count}개 검토</span>
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
