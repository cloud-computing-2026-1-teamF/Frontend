import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, api, type Vacancy } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import {
  MAX_COMPARE_VACANCIES,
  useVacancyCollections,
} from '../../features/vacancies/collections';
import { Icon } from '../../shared/Icon';
import { Footer } from '../../shared/Nav';
import { VacancyDetailMap } from './components/VacancyDetailMap';
import { RoadviewModal } from '../../shared/RoadviewModal';
import { RatioBars, VacancyMetricGrid } from './components/VacancyMetricCards';
import {
  formatArea,
  formatCount,
  formatLargeManWon,
  formatManWon,
  formatPeople,
  formatPercent,
  formatSurvivalRate,
  formatWon,
  rentBurden,
  scoreClass,
  totalCompetition,
  vacancySubtitle,
  vacancyTitle,
  type LoadStatus,
} from './model';
import './vacancy-workflows.css';

export function VacancyDetail() {
  const { id = '' } = useParams();
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [roadviewOpen, setRoadviewOpen] = useState(false);
  const collections = useVacancyCollections();
  const { user } = useAuth();
  // 공실 상세(예상 생존률 포함)는 Pro·Business 전용 — 직접 URL 접근도 차단.
  const canViewDetail = user?.tier === 'pro' || user?.tier === 'business';

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);

    api.vacancies.get(id)
      .then(data => {
        if (cancelled) return;
        setVacancy(data);
        setStatus('ok');
      })
      .catch(err => {
        if (cancelled) return;
        setError(errorMessage(err));
        setVacancy(null);
        setStatus('error');
      });

    return () => { cancelled = true; };
  }, [id]);

  const toggleCompare = (vacancyId: string) => {
    const result = collections.toggleCompare(vacancyId);
    if (!result.ok) {
      setNotice(`비교는 최대 ${MAX_COMPARE_VACANCIES}개까지 가능해요.`);
      return;
    }
    setNotice(null);
  };

  if (!canViewDetail) {
    return (
      <VacancyPageShell>
        <EmptyState
          icon="lock"
          title="Pro 플랜 전용 화면이에요"
          description="공실 상세 정보와 예상 생존률은 Pro 플랜부터 확인할 수 있어요."
        />
      </VacancyPageShell>
    );
  }

  if (status === 'loading') {
    return <VacancyPageShell><EmptyState icon="building" title="공실 정보를 불러오는 중" /></VacancyPageShell>;
  }

  if (status === 'error' || !vacancy) {
    return (
      <VacancyPageShell>
        <EmptyState icon="info" title="공실 상세를 불러오지 못했어요" description={error ?? '잠시 후 다시 시도해주세요.'} />
      </VacancyPageShell>
    );
  }

  const isShortlisted = collections.shortlistIds.includes(vacancy.id);
  const isCompared = collections.compareIds.includes(vacancy.id);
  const compareDisabled = !isCompared && collections.compareIds.length >= MAX_COMPARE_VACANCIES;
  const burden = rentBurden(vacancy);
  const hasCoord = typeof vacancy.latitude === 'number' && typeof vacancy.longitude === 'number';

  return (
    <>
      <main className="vf-page">
        <div className="container vf-container">
          <div className="vf-crumb">
            <Link to="/vacancies">공실 탐색</Link>
            <span>/</span>
            <b>상세</b>
          </div>

          <header className="vf-hero">
            <div className="vf-title-block">
              <span className={`vf-score-pill ${scoreClass(vacancy.survivalScore)}`}>
                {formatSurvivalRate(vacancy.survivalScore)}
              </span>
              <div>
                <h1>{vacancyTitle(vacancy)}</h1>
                <p>{vacancySubtitle(vacancy)}</p>
                <div className="vf-tag-row">
                  <span>{vacancy.category ?? '카테고리 미분류'}</span>
                  <span>{vacancy.multiUseFacility ? '다중이용업소' : '일반 공실'}</span>
                  <span>면적 {formatArea(vacancy.dedicatedArea ?? vacancy.locationArea)}</span>
                  {vacancy.roadAddress && <span>{vacancy.roadAddress}</span>}
                </div>
              </div>
            </div>
            <div className="vf-actions">
              <button
                type="button"
                className={`btn btn-secondary ${isShortlisted ? 'is-on' : ''}`}
                onClick={() => collections.toggleShortlist(vacancy.id)}
              >
                <Icon name={isShortlisted ? 'bookmark-filled' : 'bookmark'} size={15} />
                {isShortlisted ? '찜 해제' : '찜하기'}
              </button>
              <button
                type="button"
                className={`btn btn-secondary ${isCompared ? 'is-on' : ''}`}
                disabled={compareDisabled}
                onClick={() => toggleCompare(vacancy.id)}
              >
                <Icon name={isCompared ? 'check' : 'plus'} size={15} />
                {isCompared ? '비교 해제' : '비교 추가'}
              </button>
              <Link to="/vacancies/compare" className="btn btn-primary">
                비교 페이지
              </Link>
            </div>
          </header>

          {notice && <p className="vf-notice">{notice}</p>}

          <VacancyMetricGrid vacancy={vacancy} />

          <section className="vf-detail-dashboard">
            <Panel className="vf-panel-map" eyebrow="Map" title="위치와 주변 분포">
              <VacancyDetailMap vacancies={[vacancy]} selectedId={vacancy.id} height={400} />
              <div className="vf-map-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRoadviewOpen(true)}
                  disabled={!hasCoord}
                  title={hasCoord ? '카카오 로드뷰로 외부 전경 보기' : '좌표 정보가 없어요'}
                >
                  <Icon name="map-pin" size={15} />
                  로드뷰 보기
                </button>
              </div>
            </Panel>

            <Panel className="vf-panel-property" eyebrow="Property" title="매물 정보">
              <div className="vf-list">
                <DetailRow label="도로명주소" value={vacancy.roadAddress || '-'} />
                <DetailRow label="지번주소" value={vacancy.lotAddress || '-'} />
                <DetailRow label="상세주소" value={vacancy.detailAddress || '-'} />
                <DetailRow label="거래유형" value={vacancy.transactionType || '-'} />
                <DetailRow label="층 / 총층" value={`${vacancy.floor || '-'} / ${vacancy.totalFloors || '-'}`} />
                <DetailRow label="건물유형" value={vacancy.buildingType || '-'} />
                <DetailRow label="건물용도" value={vacancy.buildingUse || '-'} />
                <DetailRow label="지하철" value={vacancy.subway || '-'} />
              </div>
            </Panel>

            <Panel className="vf-panel-demand" eyebrow="Demand" title="인구 비율">
              <RatioBars vacancy={vacancy} />
              <div className="vf-row-grid three">
                <DataPoint label="상주/유동" value={formatPercent(vacancy.residentToFloatingRatio)} />
                <DataPoint label="직장/유동" value={formatPercent(vacancy.workerToFloatingRatio)} />
                <DataPoint label="시간대 매출" value={formatPercent(vacancy.timeBasedSalesRatio)} />
              </div>
            </Panel>

            <Panel className="vf-panel-facilities" eyebrow="Facilities" title="시설 옵션">
              <div className="vf-list">
                <DetailRow label="주차" value={formatBoolean(vacancy.parkingAvailable, vacancy.parkingCount == null ? undefined : `${formatCount(vacancy.parkingCount)}면`)} />
                <DetailRow label="엘리베이터" value={formatBoolean(vacancy.elevatorAvailable, vacancy.elevatorCount == null ? undefined : `${formatCount(vacancy.elevatorCount)}대`)} />
                <DetailRow label="화장실" value={[vacancy.restroomType, vacancy.restroomCount == null ? null : `${formatCount(vacancy.restroomCount)}개`].filter(Boolean).join(' · ') || '-'} />
                <DetailRow label="냉난방" value={[vacancy.heatingType, vacancy.airConditioner ? '에어컨' : null, vacancy.heater ? '난방기' : null].filter(Boolean).join(' · ') || '-'} />
                <DetailRow label="운영 옵션" value={[
                  vacancy.lateNightOperationAvailable ? '심야영업 가능' : null,
                  vacancy.priceNegotiable ? '가격협의' : null,
                  vacancy.rentAdjustable ? '임대료 조정' : null,
                  vacancy.rentFreePeriodAvailable ? '무상임대기간' : null,
                ].filter(Boolean).join(' · ') || '-'} />
              </div>
            </Panel>

            <Panel className="vf-panel-lease" eyebrow="Lease" title="임대 조건">
              <div className="vf-lease-grid">
                <DataPoint label="월세" value={`${formatManWon(vacancy.monthlyRent)}만원`} />
                <DataPoint label="보증금" value={formatLargeManWon(vacancy.deposit)} />
                <DataPoint label="관리비" value={`${formatManWon(vacancy.maintenanceFee)}만원`} />
                <DataPoint label="권리금" value={formatLargeManWon(vacancy.premium)} />
                <DataPoint label="임대 부담률" value={burden === null ? '-' : `${burden.toFixed(1)}%`} />
                <DataPoint label="전용면적" value={formatArea(vacancy.dedicatedArea ?? vacancy.locationArea)} />
                <DataPoint label="공급면적" value={formatArea(vacancy.supplyArea)} />
                <DataPoint label="공시지가" value={formatWon(vacancy.officialLandPrice)} />
              </div>
              <div className="vf-list vf-list-compact">
                <DetailRow label="매매가" value={formatLargeManWon(vacancy.salePrice)} />
                <DetailRow label="시설 총규모" value={formatArea(vacancy.facilityTotalSize)} />
              </div>
            </Panel>

            <Panel className="vf-panel-population" eyebrow="Population" title="인구 규모">
              <div className="vf-table-wrap">
                <table className="vf-data-table">
                  <thead>
                    <tr>
                      <th>구분</th>
                      <th>연간 합계</th>
                      <th>분기 평균</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>유동</td>
                      <td>{formatPeople(vacancy.floatingPopulationAnnualTotal)}</td>
                      <td>{formatPeople(vacancy.floatingPopulationQuarterlyAverage)}</td>
                    </tr>
                    <tr>
                      <td>상주</td>
                      <td>{formatPeople(vacancy.residentPopulationAnnualTotal)}</td>
                      <td>{formatPeople(vacancy.residentPopulationQuarterlyAverage)}</td>
                    </tr>
                    <tr>
                      <td>직장</td>
                      <td>{formatPeople(vacancy.workerPopulationAnnualTotal)}</td>
                      <td>{formatPeople(vacancy.workerPopulationQuarterlyAverage)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel className="vf-panel-competition" eyebrow="Competition" title="경쟁과 성장">
              <div className="vf-table-wrap">
                <table className="vf-data-table compact">
                  <thead>
                    <tr>
                      <th>반경</th>
                      <th>동종</th>
                      <th>식당</th>
                      <th>카페</th>
                      <th>성장률</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>250m</td>
                      <td>{formatCount(vacancy.sameCategoryRestaurantCount250m)}</td>
                      <td>{formatCount(vacancy.restaurantCount250m)}</td>
                      <td>{formatCount(vacancy.cafeCount250m)}</td>
                      <td>{formatPercent(vacancy.industryGrowthRate250m)}</td>
                    </tr>
                    <tr>
                      <td>500m</td>
                      <td>{formatCount(vacancy.sameCategoryRestaurantCount500m)}</td>
                      <td>{formatCount(vacancy.restaurantCount500m)}</td>
                      <td>{formatCount(vacancy.cafeCount500m)}</td>
                      <td>{formatPercent(vacancy.industryGrowthRate500m)}</td>
                    </tr>
                    <tr>
                      <td>1000m</td>
                      <td>{formatCount(vacancy.sameCategoryRestaurantCount1000m)}</td>
                      <td>{formatCount(vacancy.restaurantCount1000m)}</td>
                      <td>{formatCount(vacancy.cafeCount1000m)}</td>
                      <td>{formatPercent(vacancy.industryGrowthRate1000m)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="vf-mini-summary">
                <DataPoint label="500m 동종 경쟁" value={`${formatCount(totalCompetition(vacancy))}개`} />
              </div>
            </Panel>

            <Panel className="vf-panel-sales" eyebrow="Sales" title="매출과 리스크">
              <div className="vf-sales-grid">
                <DetailRow label="가게당 평균 매출" value={formatWon(vacancy.averageSalesPerStore)} />
                <DetailRow label="업종 성장률 500m" value={formatPercent(vacancy.industryGrowthRate500m)} />
                <DetailRow label="개업률" value={formatPercent(vacancy.openingRate)} />
                <DetailRow label="폐업률" value={formatPercent(vacancy.closureRate)} />
                <DetailRow label="저녁 매출 비율" value={formatPercent(vacancy.timeBasedSalesRatio)} />
                <DetailRow label="심야 매출 비율" value={formatPercent(vacancy.lateNightSalesRatio)} />
                <DetailRow label="주말 매출 비율" value={formatPercent(vacancy.weekendSalesRatio)} />
                <DetailRow label="총 지출" value={formatWon(vacancy.totalSpending)} />
                <DetailRow label="음식 지출" value={formatWon(vacancy.foodSpending)} />
              </div>
            </Panel>
          </section>
        </div>
      </main>
      <Footer />
      <RoadviewModal
        open={roadviewOpen}
        onClose={() => setRoadviewOpen(false)}
        target={{
          id: vacancy.id,
          latitude: vacancy.latitude,
          longitude: vacancy.longitude,
          title: vacancyTitle(vacancy),
          subtitle: `${vacancy.roadAddress || vacancySubtitle(vacancy)} · 월세 ${formatManWon(vacancy.monthlyRent)}만`,
        }}
      />
    </>
  );
}

function VacancyPageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="vf-page">
        <div className="container vf-container">{children}</div>
      </main>
      <Footer />
    </>
  );
}

function Panel({ className, eyebrow, title, children }: { className?: string; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className={`vf-panel${className ? ` ${className}` : ''}`}>
      <div className="vf-panel-head">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="vf-detail-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function formatBoolean(value?: boolean | null, detail?: string): string {
  if (value === null || value === undefined) return '-';
  if (!value) return '없음';
  return detail ? `있음 · ${detail}` : '있음';
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description?: string }) {
  return (
    <div className="vf-empty">
      <Icon name={icon} size={30} />
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      <Link to="/vacancies" className="btn btn-primary">공실 탐색으로 돌아가기</Link>
    </div>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return `${error.status} · ${error.message}`;
  if (error instanceof Error) return error.message;
  return '알 수 없는 오류가 발생했어요.';
}
