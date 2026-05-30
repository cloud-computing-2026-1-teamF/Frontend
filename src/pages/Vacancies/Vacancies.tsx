import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './vacancies.css';
import {
  ApiError,
  api,
  type AreaSearchHit,
  type BusinessType,
  type Vacancy,
  type VacancySearchQuery,
  type VacancySearchResponse,
  type VacancySearchSort,
} from '../../api';
import { Icon } from '../../shared/Icon';
import { Footer } from '../../shared/Nav';
import { NumberField } from './components/NumberField';
import { SummaryTile } from './components/SummaryTile';
import { VacancyInspector } from './components/VacancyInspector';
import { VacancyMapPanel } from './components/VacancyMapPanel';
import { VacancyTable } from './components/VacancyTable';
import {
  MAX_COMPARE_VACANCIES,
  MIN_COMPARE_VACANCIES,
  useVacancyCollections,
} from '../../features/vacancies/collections';
import {
  defaultFilters,
  EMPTY_SUMMARY,
  formatCount,
  formatManWon,
  formatScore,
  MAP_PAGE_SIZE,
  numberInput,
  PAGE_SIZE,
  priceFilterParams,
  SORT_OPTIONS,
  transactionTypeParam,
  TRANSACTION_OPTIONS,
  type FilterState,
  type LoadStatus,
} from './model';

export function Vacancies() {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [areaQuery, setAreaQuery] = useState('');
  const [areaOptions, setAreaOptions] = useState<AreaSearchHit[]>([]);
  const [selectedArea, setSelectedArea] = useState<AreaSearchHit | null>(null);
  const [areaLoading, setAreaLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<VacancySearchResponse | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collectionNotice, setCollectionNotice] = useState<string | null>(null);
  const [mapItems, setMapItems] = useState<Vacancy[]>([]);
  const [mapStatus, setMapStatus] = useState<LoadStatus>('loading');
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const collections = useVacancyCollections();

  useEffect(() => {
    collections.clearCompare();
    // Compare is a scratch workflow. Entering the explorer starts a fresh set
    // so old localStorage selections do not leak into a new search session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchQuery = useMemo<VacancySearchQuery>(() => ({
    areaId: selectedArea?.id,
    categoryId: filters.categoryId || undefined,
    scoreMode: 'best',
    transactionType: transactionTypeParam(filters.transactionType),
    q: filters.q.trim() || undefined,
    ...priceFilterParams(filters),
    scoreMin: numberInput(filters.scoreMin),
    areaMin: numberInput(filters.areaMin),
    areaMax: numberInput(filters.areaMax),
    page,
    size: PAGE_SIZE,
    sort: filters.sort,
  }), [filters, page, selectedArea?.id]);

  const mapQuery = useMemo<VacancySearchQuery>(() => ({
    areaId: selectedArea?.id,
    categoryId: filters.categoryId || undefined,
    scoreMode: 'best',
    transactionType: transactionTypeParam(filters.transactionType),
    q: filters.q.trim() || undefined,
    ...priceFilterParams(filters),
    scoreMin: numberInput(filters.scoreMin),
    areaMin: numberInput(filters.areaMin),
    areaMax: numberInput(filters.areaMax),
    page: 0,
    size: MAP_PAGE_SIZE,
    sort: filters.sort,
  }), [filters, selectedArea?.id]);

  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [debouncedMapQuery, setDebouncedMapQuery] = useState(mapQuery);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery), 180);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedMapQuery(mapQuery), 220);
    return () => window.clearTimeout(timer);
  }, [mapQuery]);

  useEffect(() => {
    let cancelled = false;
    api.catalog.listBusinessTypes()
      .then(types => { if (!cancelled) setBusinessTypes(types); })
      .catch(() => { if (!cancelled) setBusinessTypes([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);

    api.vacancies.search(debouncedQuery)
      .then(data => {
        if (cancelled) return;
        setResult(data);
        setStatus('ok');
      })
      .catch(err => {
        if (cancelled) return;
        setError(errorMessage(err));
        setStatus('error');
      });

    return () => { cancelled = true; };
  }, [debouncedQuery, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setMapStatus('loading');
    api.vacancies.search(debouncedMapQuery)
      .then(data => {
        if (!cancelled) {
          setMapItems(data.items);
          setMapStatus('ok');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMapItems([]);
          setMapStatus('error');
        }
      });

    return () => { cancelled = true; };
  }, [debouncedMapQuery, refreshKey]);

  useEffect(() => {
    const keyword = areaQuery.trim();
    if (selectedArea && areaQuery === selectedArea.fullName) {
      setAreaOptions([]);
      setAreaLoading(false);
      return;
    }
    if (keyword.length < 2) {
      setAreaOptions([]);
      setAreaLoading(false);
      return;
    }

    let cancelled = false;
    setAreaLoading(true);
    const timer = window.setTimeout(() => {
      api.catalog.searchAreas(keyword)
        .then(data => { if (!cancelled) setAreaOptions(data); })
        .catch(() => { if (!cancelled) setAreaOptions([]); })
        .finally(() => { if (!cancelled) setAreaLoading(false); });
    }, 160);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [areaQuery, selectedArea]);

  const vacancies = result?.items ?? [];
  const mapVacancies = mapItems.length > 0 ? mapItems : vacancies;
  const summary = result?.summary ?? EMPTY_SUMMARY;
  const summaryLoading = status === 'loading' && result === null;
  const mapLoading = mapStatus === 'loading' && mapItems.length === 0 && vacancies.length === 0;
  // The inspector should be able to show any vacancy the user can click,
  // including map pins that live outside the current paginated table page.
  // Look up the selected id in both pools (table page + larger map slice)
  // before falling back to the first table row.
  const selectedVacancy = useMemo(() => {
    if (selectedId) {
      const hit =
        vacancies.find(vacancy => vacancy.id === selectedId) ??
        mapVacancies.find(vacancy => vacancy.id === selectedId);
      if (hit) return hit;
    }
    return vacancies[0] ?? mapVacancies[0] ?? null;
  }, [selectedId, vacancies, mapVacancies]);

  useEffect(() => {
    if (!vacancies.length && !mapVacancies.length) {
      setSelectedId(null);
      return;
    }
    // Keep a map-only selection (pin clicked outside the visible table page)
    // alive — only reset when the id is missing from BOTH pools.
    if (
      selectedId &&
      (vacancies.some(vacancy => vacancy.id === selectedId) ||
        mapVacancies.some(vacancy => vacancy.id === selectedId))
    ) {
      return;
    }
    setSelectedId(vacancies[0]?.id ?? mapVacancies[0]?.id ?? null);
  }, [selectedId, vacancies, mapVacancies]);

  const hasFilters = selectedArea !== null ||
    filters.q.trim() !== '' ||
    filters.categoryId !== '' ||
    filters.transactionType !== defaultFilters.transactionType ||
    filters.rentMax !== '' ||
    filters.depositMax !== '' ||
    filters.maintenanceFeeMax !== '' ||
    filters.salePriceMax !== '' ||
    filters.premiumMax !== '' ||
    filters.scoreMin !== '' ||
    filters.areaMin !== '' ||
    filters.areaMax !== '' ||
    filters.sort !== defaultFilters.sort;

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(0);
  };

  // 거래유형을 바꾸면 보이지 않게 되는 가격 입력값은 비워, 숨겨진 값이
  // 검색에 묻혀 들어가거나 필터 초기화 버튼을 헷갈리게 만들지 않도록 한다.
  // (관리비는 모든 거래유형에 공통이라 유지)
  const changeTransactionType = (value: FilterState['transactionType']) => {
    setFilters(prev => ({
      ...prev,
      transactionType: value,
      rentMax: '',
      depositMax: '',
      salePriceMax: '',
      premiumMax: '',
    }));
    setPage(0);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setSelectedArea(null);
    setAreaQuery('');
    setAreaOptions([]);
    setPage(0);
  };

  const selectArea = (area: AreaSearchHit) => {
    setSelectedArea(area);
    setAreaQuery(area.fullName);
    setAreaOptions([]);
    setPage(0);
  };

  const clearArea = () => {
    setSelectedArea(null);
    setAreaQuery('');
    setAreaOptions([]);
    setPage(0);
  };

  const toggleCompare = (id: string) => {
    const result = collections.toggleCompare(id);
    if (!result.ok && result.reason === 'compare_limit') {
      setCollectionNotice(`비교는 최대 ${MAX_COMPARE_VACANCIES}개까지 가능해요. 기존 선택을 해제한 뒤 다시 선택하세요.`);
      return;
    }
    setCollectionNotice(null);
  };

  const toggleShortlist = async (id: string) => {
    const result = await collections.toggleShortlist(id);
    if (!result.ok && result.reason === 'network_error') {
      setCollectionNotice('찜 목록을 서버에 반영하지 못했어요. 네트워크를 확인해 주세요.');
      return;
    }
    setCollectionNotice(null);
  };

  const selectedIsShortlisted = selectedVacancy ? collections.shortlistIds.includes(selectedVacancy.id) : false;
  const selectedIsCompared = selectedVacancy ? collections.compareIds.includes(selectedVacancy.id) : false;

  return (
    <>
      <main className="vacancy-page">
        <div className="container vacancy-container">
          <header className="vacancy-header">
            <div className="vacancy-crumb">
              <span>상권AI</span>
              <span>/</span>
              <b>공실 탐색</b>
            </div>
            <div className="vacancy-title-row">
              <div>
                <h1>공실 탐색</h1>
                <p>후보 공실을 조건별로 검토하고, 상권 지표와 임대 조건을 한 화면에서 비교합니다.</p>
              </div>
              <Link to="/analyze" className="btn btn-primary vacancy-title-action">
                <Icon name="sparkles" size={15} />
                입지 분석 시작
              </Link>
            </div>
          </header>

          <section className="vacancy-summary-grid" aria-label="공실 탐색 요약">
            <SummaryTile icon="database" label="검색 결과" value={formatCount(summary.total)} unit="개" loading={summaryLoading} />
            <SummaryTile icon="trending" label="평균 생존점수" value={formatScore(summary.averageScore)} unit="/100" tone="blue" loading={summaryLoading} />
            <SummaryTile icon="building" label="평균 월세" value={formatManWon(summary.averageRent)} unit="만원" tone="teal" loading={summaryLoading} />
            <SummaryTile icon="map-pin" label="행정동 수" value={formatCount(summary.areaCount)} unit="곳" tone="amber" loading={summaryLoading} />
          </section>

          <section className="vacancy-workspace">
            <aside className="vacancy-filter-panel" aria-label="공실 필터">
              <div className="vacancy-panel-head">
                <div>
                  <span className="vacancy-panel-eyebrow">Filters</span>
                  <h2>탐색 조건</h2>
                </div>
                {hasFilters && (
                  <button className="vacancy-icon-btn" type="button" onClick={resetFilters} title="필터 초기화">
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>

              <KeywordFilter value={filters.q} onChange={value => updateFilter('q', value)} />
              <CategoryFilter
                value={filters.categoryId}
                options={businessTypes}
                onChange={value => updateFilter('categoryId', value)}
              />
              <AreaFilter
                value={areaQuery}
                loading={areaLoading}
                options={areaOptions}
                selectedArea={selectedArea}
                onChange={value => {
                  setAreaQuery(value);
                  if (selectedArea) setSelectedArea(null);
                  setPage(0);
                }}
                onClear={clearArea}
                onSelect={selectArea}
              />

              <div className="vacancy-filter-group">
                <label>거래유형</label>
                <div className="vacancy-transaction-tabs" role="tablist" aria-label="거래유형">
                  {TRANSACTION_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={filters.transactionType === option.value}
                      className={filters.transactionType === option.value ? 'is-on' : ''}
                      onClick={() => changeTransactionType(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="vacancy-filter-grid">
                {filters.transactionType === '매매' ? (
                  <>
                    <NumberField label="매매가 최대" value={filters.salePriceMax} suffix="만원" onChange={value => updateFilter('salePriceMax', value)} />
                    <NumberField label="권리금 최대" value={filters.premiumMax} suffix="만원" onChange={value => updateFilter('premiumMax', value)} />
                    <NumberField label="관리비 최대" value={filters.maintenanceFeeMax} suffix="만원" onChange={value => updateFilter('maintenanceFeeMax', value)} />
                  </>
                ) : filters.transactionType === '전세' ? (
                  <>
                    <NumberField label="전세금 최대" value={filters.depositMax} suffix="만원" onChange={value => updateFilter('depositMax', value)} />
                    <NumberField label="관리비 최대" value={filters.maintenanceFeeMax} suffix="만원" onChange={value => updateFilter('maintenanceFeeMax', value)} />
                  </>
                ) : (
                  <>
                    <NumberField label="월세 최대" value={filters.rentMax} suffix="만원" onChange={value => updateFilter('rentMax', value)} />
                    <NumberField label="보증금 최대" value={filters.depositMax} suffix="만원" onChange={value => updateFilter('depositMax', value)} />
                    <NumberField label="관리비 최대" value={filters.maintenanceFeeMax} suffix="만원" onChange={value => updateFilter('maintenanceFeeMax', value)} />
                  </>
                )}
                <NumberField label="최소 점수" value={filters.scoreMin} suffix="점" onChange={value => updateFilter('scoreMin', value)} />
                <NumberField label="면적 최소" value={filters.areaMin} suffix="㎡" onChange={value => updateFilter('areaMin', value)} />
                <NumberField label="면적 최대" value={filters.areaMax} suffix="㎡" onChange={value => updateFilter('areaMax', value)} />
              </div>

              <div className="vacancy-filter-group">
                <label htmlFor="vacancy-sort">정렬</label>
                <select id="vacancy-sort" value={filters.sort} onChange={event => updateFilter('sort', event.target.value as VacancySearchSort)}>
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </aside>

            <section className="vacancy-results-panel">
              <VacancyMapPanel items={mapVacancies} selectedId={selectedVacancy?.id ?? null} onSelect={setSelectedId} loading={mapLoading} />

              <div className="vacancy-list-panel">
                <div className="vacancy-list-head">
                  <div>
                    <span className="vacancy-panel-eyebrow">Inventory</span>
                    <h2>공실 목록</h2>
                  </div>
                  <div className={`vacancy-status-chip ${status === 'error' ? 'is-error' : ''}`}>
                    {status === 'loading' ? '동기화 중' : status === 'error' ? '오류' : `${formatCount(result?.total ?? 0)}개`}
                  </div>
                </div>

                {status === 'error' && (
                  <div className="vacancy-error">
                    <Icon name="info" size={18} />
                    <div>
                      <b>공실 데이터를 불러오지 못했어요</b>
                      <p>{error}</p>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRefreshKey(key => key + 1)}>
                      다시 시도
                    </button>
                  </div>
                )}

                {status === 'loading' && vacancies.length === 0 && (
                  <VacancyLoadingState />
                )}

                {status === 'ok' && vacancies.length === 0 && (
                  <div className="vacancy-empty">
                    <Icon name="search" size={30} />
                    <h3>조건에 맞는 공실이 없어요</h3>
                    <p>임대 조건을 조금 넓히거나 행정동 필터를 해제해보세요.</p>
                  </div>
                )}

                {vacancies.length > 0 && (
                  <>
                    <div className="vacancy-collection-strip" aria-label="공실 컬렉션 바로가기">
                      <div className="vacancy-collection-main">
                        <span className="vacancy-collection-chip">
                          <Icon name="check" size={12} />
                          비교 {collections.compareIds.length}/{MAX_COMPARE_VACANCIES}
                        </span>
                        <span className="vacancy-collection-chip">
                          <Icon name="bookmark" size={12} />
                          찜 {collections.shortlistIds.length}
                        </span>
                        {collectionNotice && <p className="vacancy-collection-notice">{collectionNotice}</p>}
                      </div>
                      <div className="vacancy-collection-actions">
                        <Link
                          to="/vacancies/compare"
                          className={`btn btn-secondary btn-sm ${collections.compareIds.length < MIN_COMPARE_VACANCIES ? 'is-disabled' : ''}`}
                          aria-disabled={collections.compareIds.length < MIN_COMPARE_VACANCIES}
                        >
                          비교 보기
                        </Link>
                        <Link to="/shortlist" className="btn btn-secondary btn-sm">
                          찜 목록
                        </Link>
                        {collections.compareIds.length > 0 && (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={collections.clearCompare}>
                            비교 초기화
                          </button>
                        )}
                      </div>
                    </div>
                    <VacancyTable
                      items={vacancies}
                      selectedId={selectedVacancy?.id ?? null}
                      shortlistIds={collections.shortlistIds}
                      compareIds={collections.compareIds}
                      onSelect={setSelectedId}
                      onToggleShortlist={toggleShortlist}
                      onToggleCompare={toggleCompare}
                    />
                    <div className="vacancy-pagination">
                      <button type="button" className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(prev => Math.max(0, prev - 1))}>
                        <Icon name="chevron-left" size={13} />
                        이전
                      </button>
                      <span>{page + 1} / {Math.max(1, result?.totalPages ?? 1)}</span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={!result || page + 1 >= result.totalPages}
                        onClick={() => setPage(prev => prev + 1)}
                      >
                        다음
                        <Icon name="chevron-right" size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </section>

            <VacancyInspector
              vacancy={selectedVacancy}
              loading={summaryLoading}
              isShortlisted={selectedIsShortlisted}
              isCompared={selectedIsCompared}
              compareDisabled={!selectedIsCompared && collections.compareIds.length >= MAX_COMPARE_VACANCIES}
              onToggleShortlist={toggleShortlist}
              onToggleCompare={toggleCompare}
            />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function VacancyLoadingState() {
  return (
    <div className="vacancy-loading" aria-label="공실 데이터를 불러오는 중">
      <div className="vacancy-loading-mapline" />
      {Array.from({ length: 5 }).map((_, index) => (
        <div className="vacancy-loading-row" key={index}>
          <span />
          <div>
            <b />
            <em />
          </div>
          <i />
        </div>
      ))}
    </div>
  );
}

function KeywordFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="vacancy-filter-group">
      <label htmlFor="vacancy-keyword">키워드</label>
      <div className="vacancy-input-shell">
        <Icon name="search" size={15} />
        <input
          id="vacancy-keyword"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder="공실명, 업종, 카테고리"
        />
        {value && (
          <button type="button" onClick={() => onChange('')} title="키워드 지우기">
            <Icon name="close" size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function CategoryFilter({ value, options, onChange }: {
  value: string;
  options: BusinessType[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="vacancy-filter-group">
      <label htmlFor="vacancy-category">최고 점수 업종</label>
      <select id="vacancy-category" value={value} onChange={event => onChange(event.target.value)}>
        <option value="">전체 최고 점수</option>
        {options.map(option => (
          <option key={option.key} value={option.key}>
            {option.emoji} {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AreaFilter({ value, loading, options, selectedArea, onChange, onClear, onSelect }: {
  value: string;
  loading: boolean;
  options: AreaSearchHit[];
  selectedArea: AreaSearchHit | null;
  onChange: (value: string) => void;
  onClear: () => void;
  onSelect: (area: AreaSearchHit) => void;
}) {
  return (
    <div className="vacancy-filter-group">
      <label htmlFor="vacancy-area">행정동</label>
      <div className="vacancy-area-search">
        <div className="vacancy-input-shell">
          <Icon name="map-pin" size={15} />
          <input
            id="vacancy-area"
            value={value}
            onChange={event => onChange(event.target.value)}
            placeholder="예: 서교동"
          />
          {selectedArea && (
            <button type="button" onClick={onClear} title="행정동 선택 해제">
              <Icon name="close" size={12} />
            </button>
          )}
        </div>
        {(loading || options.length > 0) && (
          <div className="vacancy-area-options">
            {loading && <div className="vacancy-area-option muted">검색 중</div>}
            {!loading && options.map(area => (
              <button type="button" key={area.id} className="vacancy-area-option" onClick={() => onSelect(area)}>
                <b>{area.name}</b>
                <span>{area.region}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return `${error.status} · ${error.message}`;
  if (error instanceof Error) return error.message;
  return '알 수 없는 오류가 발생했어요.';
}
