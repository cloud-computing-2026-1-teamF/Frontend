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
import { MetricCard } from './components/VacancyMetricCards';
import {
  formatArea,
  formatCount,
  formatLargeManWon,
  formatManWon,
  formatPeople,
  formatScore,
  rentBurden,
  scoreClass,
  totalCompetition,
  vacancySubtitle,
  vacancyTitle,
  type LoadStatus,
} from './model';
import './vacancy-workflows.css';

export function Shortlist() {
  const collections = useVacancyCollections();
  const [items, setItems] = useState<Vacancy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [notice, setNotice] = useState<string | null>(null);
  const shortlistKey = collections.shortlistIds.join('|');

  useEffect(() => {
    let cancelled = false;
    if (collections.shortlistIds.length === 0) {
      setItems([]);
      setStatus('ok');
      return;
    }

    setStatus('loading');
    fetchVacanciesByIds(collections.shortlistIds)
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
  }, [shortlistKey, collections.shortlistIds]);

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some(item => item.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const summary = useMemo(() => {
    return {
      averageScore: average(items.map(item => item.survivalScore)),
      averageRent: average(items.map(item => item.monthlyRent)),
      averageDeposit: average(items.map(item => item.deposit)),
      areaCount: new Set(items.map(item => item.areaId)).size,
    };
  }, [items]);

  const toggleCompare = (id: string) => {
    const result = collections.toggleCompare(id);
    if (!result.ok) {
      setNotice(`비교는 최대 ${MAX_COMPARE_VACANCIES}개까지 가능해요.`);
      return;
    }
    setNotice(null);
  };

  return (
    <>
      <main className="vf-page">
        <div className="container vf-container">
          <div className="vf-crumb">
            <Link to="/vacancies">공실 탐색</Link>
            <span>/</span>
            <b>찜 목록</b>
          </div>

          <header className="vf-hero">
            <div className="vf-title-block">
              <span className="vf-icon-pill"><Icon name="bookmark" size={18} /></span>
              <div>
                <h1>찜한 공실</h1>
                <p>데모와 의사결정에 다시 꺼내 볼 공실을 저장하고, 바로 비교 목록으로 보낼 수 있습니다.</p>
                <div className="vf-tag-row">
                  <span>저장 {collections.shortlistIds.length}개</span>
                  <span>비교 {collections.compareIds.length}/{MAX_COMPARE_VACANCIES}</span>
                </div>
              </div>
            </div>
            <div className="vf-actions">
              <Link to="/vacancies" className="btn btn-secondary">
                <Icon name="search" size={15} />
                공실 탐색
              </Link>
              <Link
                to="/vacancies/compare"
                className={`btn btn-primary ${collections.compareIds.length < MIN_COMPARE_VACANCIES ? 'is-disabled' : ''}`}
                aria-disabled={collections.compareIds.length < MIN_COMPARE_VACANCIES}
              >
                비교 보기
              </Link>
            </div>
          </header>

          {notice && <p className="vf-notice">{notice}</p>}

          {status === 'loading' && <ShortlistEmpty title="찜한 공실을 불러오는 중" />}
          {status === 'error' && <ShortlistEmpty title="찜 목록을 불러오지 못했어요" />}
          {status === 'ok' && items.length === 0 && (
            <ShortlistEmpty
              title="아직 찜한 공실이 없어요"
              description="공실 탐색에서 북마크 버튼을 눌러 관심 공실을 저장해보세요."
            />
          )}
          {status === 'ok' && items.length > 0 && (
            <>
              <div className="vf-metric-grid shortlist-summary">
                <MetricCard label="찜한 공실" value={formatCount(items.length)} unit="개" tone="brand" />
                <MetricCard label="평균 생존점수" value={formatScore(summary.averageScore)} unit="/100" tone="blue" />
                <MetricCard label="평균 월세" value={formatManWon(summary.averageRent)} unit="만원" tone="teal" />
                <MetricCard label="행정동 수" value={formatCount(summary.areaCount)} unit="곳" tone="amber" />
              </div>

              <section className="vf-panel">
                <div className="vf-panel-head">
                  <span>Map</span>
                  <h2>찜한 공실 위치</h2>
                </div>
                <VacancyDetailMap vacancies={items} selectedId={selectedId} onSelect={setSelectedId} height={360} />
              </section>

              <section className="vshort-grid" aria-label="찜한 공실 카드">
                {items.map(item => {
                  const isCompared = collections.compareIds.includes(item.id);
                  const compareDisabled = !isCompared && collections.compareIds.length >= MAX_COMPARE_VACANCIES;
                  const burden = rentBurden(item);

                  return (
                    <article key={item.id} className={`vshort-card ${item.id === selectedId ? 'is-selected' : ''}`}>
                      <button type="button" className="vshort-card-head" onClick={() => setSelectedId(item.id)}>
                        <span className={`vf-score-pill small ${scoreClass(item.survivalScore)}`}>
                          {formatScore(item.survivalScore)}
                        </span>
                        <div>
                          <h2>{vacancyTitle(item)}</h2>
                          <p>{vacancySubtitle(item)}</p>
                        </div>
                      </button>

                      <div className="vshort-metrics">
                        <DataPoint label="월세" value={`${formatManWon(item.monthlyRent)}만원`} />
                        <DataPoint label="보증금" value={formatLargeManWon(item.deposit)} />
                        <DataPoint label="면적" value={formatArea(item.locationArea)} />
                        <DataPoint label="분기 유동" value={formatPeople(item.floatingPopulationQuarterlyAverage)} />
                        <DataPoint label="경쟁 500m" value={`${formatCount(totalCompetition(item))}개`} />
                        <DataPoint label="임대 부담률" value={burden === null ? '-' : `${burden.toFixed(1)}%`} />
                      </div>

                      <div className="vshort-actions">
                        <Link to={`/vacancies/${item.id}`} className="btn btn-secondary btn-sm">상세 보기</Link>
                        <button
                          type="button"
                          className={`btn btn-secondary btn-sm ${isCompared ? 'is-on' : ''}`}
                          disabled={compareDisabled}
                          onClick={() => toggleCompare(item.id)}
                        >
                          {isCompared ? '비교 해제' : '비교 추가'}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => collections.removeShortlist(item.id)}>
                          찜 해제
                        </button>
                      </div>
                    </article>
                  );
                })}
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

function ShortlistEmpty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="vf-empty">
      <Icon name="bookmark" size={30} />
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      <Link to="/vacancies" className="btn btn-primary">공실 탐색으로 이동</Link>
    </div>
  );
}

function average(values: Array<number | null | undefined>): number | null {
  const numeric = values
    .map(value => Number(value))
    .filter(value => Number.isFinite(value));
  if (!numeric.length) return null;
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}
