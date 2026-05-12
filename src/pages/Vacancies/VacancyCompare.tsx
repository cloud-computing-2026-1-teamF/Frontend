import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Vacancy } from '../../api';
import {
  MAX_COMPARE_VACANCIES,
  MIN_COMPARE_VACANCIES,
  useVacancyCollections,
} from '../../features/vacancies/collections';
import { fetchVacanciesByIds } from '../../features/vacancies/api';
import { Icon } from '../../shared/Icon';
import { Footer } from '../../shared/Nav';
import { VacancyDetailMap } from './components/VacancyDetailMap';
import {
  formatArea,
  formatCount,
  formatLargeManWon,
  formatManWon,
  formatPeople,
  formatPercent,
  formatScore,
  rentBurden,
  scoreClass,
  totalCompetition,
  vacancySubtitle,
  vacancyTitle,
  type LoadStatus,
} from './model';
import './vacancy-workflows.css';

type CompareRow = {
  label: string;
  help: string;
  higherBetter: boolean;
  getValue: (vacancy: Vacancy) => number | null | undefined;
  format: (value: number | null | undefined) => string;
};

const COMPARE_ROWS: CompareRow[] = [
  {
    label: '생존점수',
    help: '높을수록 유리',
    higherBetter: true,
    getValue: vacancy => vacancy.survivalScore,
    format: formatScore,
  },
  {
    label: '월세+관리비',
    help: '낮을수록 부담이 작음',
    higherBetter: false,
    getValue: vacancy => (vacancy.monthlyRent ?? 0) + (vacancy.maintenanceFee ?? 0),
    format: value => `${formatManWon(value)}만원`,
  },
  {
    label: '보증금',
    help: '초기 비용',
    higherBetter: false,
    getValue: vacancy => vacancy.deposit,
    format: formatLargeManWon,
  },
  {
    label: '전용면적',
    help: '넓을수록 운영 여지가 큼',
    higherBetter: true,
    getValue: vacancy => vacancy.locationArea,
    format: formatArea,
  },
  {
    label: '경쟁 점포 500m',
    help: '식당+카페 합계',
    higherBetter: false,
    getValue: totalCompetition,
    format: value => `${formatCount(value)}개`,
  },
  {
    label: '분기 유동',
    help: '상권 수요 규모',
    higherBetter: true,
    getValue: vacancy => vacancy.floatingPopulationQuarterlyAverage,
    format: formatPeople,
  },
  {
    label: '가게당 평균 매출',
    help: '주변 점포 평균',
    higherBetter: true,
    getValue: vacancy => vacancy.averageSalesPerStore,
    format: value => `${formatManWon(value)}만원`,
  },
  {
    label: '업종 성장률 500m',
    help: '상권 업종 성장세',
    higherBetter: true,
    getValue: vacancy => vacancy.industryGrowthRate500m,
    format: formatPercent,
  },
  {
    label: '폐업률',
    help: '낮을수록 안정적',
    higherBetter: false,
    getValue: vacancy => vacancy.closureRate,
    format: formatPercent,
  },
  {
    label: '개업률',
    help: '시장 진입 활력',
    higherBetter: true,
    getValue: vacancy => vacancy.openingRate,
    format: formatPercent,
  },
  {
    label: '임대 부담률',
    help: '월 임대비 / 평균 매출',
    higherBetter: false,
    getValue: rentBurden,
    format: value => value == null ? '-' : `${value.toFixed(1)}%`,
  },
];

export function VacancyCompare() {
  const collections = useVacancyCollections();
  const [items, setItems] = useState<Vacancy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');

  const compareKey = collections.compareIds.join('|');

  useEffect(() => {
    let cancelled = false;
    if (collections.compareIds.length === 0) {
      setItems([]);
      setStatus('ok');
      return;
    }

    setStatus('loading');
    fetchVacanciesByIds(collections.compareIds)
      .then(data => {
        if (cancelled) return;
        setItems(data);
        setStatus('ok');
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setStatus('error');
      });

    return () => { cancelled = true; };
  }, [compareKey, collections.compareIds]);

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some(item => item.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const enoughItems = items.length >= MIN_COMPARE_VACANCIES;
  const bestByRow = useMemo(() => {
    const map = new Map<string, number>();
    COMPARE_ROWS.forEach(row => {
      const values = items
        .map(item => numericValue(row.getValue(item)))
        .filter((value): value is number => value !== null);
      if (!values.length) return;
      map.set(row.label, row.higherBetter ? Math.max(...values) : Math.min(...values));
    });
    return map;
  }, [items]);

  return (
    <>
      <main className="vf-page">
        <div className="container vf-container">
          <div className="vf-crumb">
            <Link to="/vacancies">공실 탐색</Link>
            <span>/</span>
            <b>공실 비교</b>
          </div>

          <header className="vf-hero">
            <div className="vf-title-block">
              <span className="vf-icon-pill"><Icon name="layers" size={18} /></span>
              <div>
                <h1>공실 비교</h1>
                <p>선택한 2-4개 공실을 임대 부담, 경쟁, 유동, 매출, 리스크 기준으로 나란히 검토합니다.</p>
                <div className="vf-tag-row">
                  <span>선택 {collections.compareIds.length}/{MAX_COMPARE_VACANCIES}</span>
                  <span>최소 {MIN_COMPARE_VACANCIES}개 필요</span>
                </div>
              </div>
            </div>
            <div className="vf-actions">
              <Link to="/vacancies" className="btn btn-secondary">
                <Icon name="plus" size={15} />
                공실 추가
              </Link>
              <button type="button" className="btn btn-ghost" onClick={collections.clearCompare} disabled={collections.compareIds.length === 0}>
                비교 초기화
              </button>
            </div>
          </header>

          {status === 'loading' && <EmptyCompare title="비교할 공실을 불러오는 중" />}
          {status === 'error' && <EmptyCompare title="비교 데이터를 불러오지 못했어요" />}
          {status === 'ok' && items.length === 0 && (
            <EmptyCompare
              title="비교할 공실이 아직 없어요"
              description="공실 탐색에서 관심 있는 행의 + 버튼을 눌러 비교 목록을 만들어보세요."
            />
          )}
          {status === 'ok' && items.length > 0 && (
            <>
              {!enoughItems && (
                <p className="vf-notice">비교표를 완성하려면 공실을 {MIN_COMPARE_VACANCIES - items.length}개 더 선택하세요.</p>
              )}

              <section className="vcmp-card-grid" aria-label="비교 공실 카드">
                {items.map(item => (
                  <article key={item.id} className={`vcmp-card ${item.id === selectedId ? 'is-selected' : ''}`}>
                    <button type="button" className="vcmp-card-main" onClick={() => setSelectedId(item.id)}>
                      <span className={`vf-score-pill small ${scoreClass(item.survivalScore)}`}>
                        {formatScore(item.survivalScore)}
                      </span>
                      <div>
                        <h2>{vacancyTitle(item)}</h2>
                        <p>{vacancySubtitle(item)}</p>
                      </div>
                    </button>
                    <div className="vcmp-card-metrics">
                      <DataPoint label="월세" value={`${formatManWon(item.monthlyRent)}만원`} />
                      <DataPoint label="보증금" value={formatLargeManWon(item.deposit)} />
                      <DataPoint label="경쟁" value={`${formatCount(totalCompetition(item))}개`} />
                    </div>
                    <div className="vcmp-card-actions">
                      <Link to={`/vacancies/${item.id}`} className="btn btn-secondary btn-sm">상세</Link>
                      <button
                        type="button"
                        className={`btn btn-secondary btn-sm ${collections.shortlistIds.includes(item.id) ? 'is-on' : ''}`}
                        onClick={() => collections.toggleShortlist(item.id)}
                      >
                        <Icon name={collections.shortlistIds.includes(item.id) ? 'bookmark-filled' : 'bookmark'} size={13} />
                        찜
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => collections.removeCompare(item.id)}>
                        제거
                      </button>
                    </div>
                  </article>
                ))}
              </section>

              <section className="vf-panel">
                <div className="vf-panel-head">
                  <span>Map</span>
                  <h2>선택 공실 위치</h2>
                </div>
                <VacancyDetailMap vacancies={items} selectedId={selectedId} onSelect={setSelectedId} height={360} />
              </section>

              <section className="vf-panel">
                <div className="vf-panel-head">
                  <span>Matrix</span>
                  <h2>핵심 지표 비교</h2>
                </div>
                <div className="vcmp-table-wrap">
                  <table className="vcmp-table">
                    <thead>
                      <tr>
                        <th>지표</th>
                        {items.map(item => (
                          <th key={item.id}>{vacancyTitle(item)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARE_ROWS.map(row => {
                        const best = bestByRow.get(row.label);
                        return (
                          <tr key={row.label}>
                            <td>
                              <b>{row.label}</b>
                              <span>{row.help}</span>
                            </td>
                            {items.map(item => {
                              const raw = row.getValue(item);
                              const numeric = numericValue(raw);
                              const isBest = best !== undefined && numeric !== null && Math.abs(numeric - best) < 0.0001;
                              return (
                                <td key={item.id} className={isBest ? 'is-best' : ''}>
                                  {row.format(raw)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="vf-data-point">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function EmptyCompare({ title, description }: { title: string; description?: string }) {
  return (
    <div className="vf-empty">
      <Icon name="layers" size={30} />
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      <Link to="/vacancies" className="btn btn-primary">공실 탐색으로 이동</Link>
    </div>
  );
}

function numericValue(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  return Number(value);
}
