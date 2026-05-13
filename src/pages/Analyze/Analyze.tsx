// Analyze page — fullscreen Kakao map + step widget + Top 3 results
//
// Map is the real Kakao Maps JS SDK via `react-kakao-maps-sdk`.
//   - Step 1 picks a 업종, Step 2 lets the user search a place (kakao Places)
//     or right-click to drop a marker. Radius fixed at 500m.
//   - Pressing 분석 calls `POST /analyses` and reveals Top 3 properties
//     overlaid on the map as numbered pins.
import { useEffect, useMemo, useRef, useState } from 'react';
import './analyze.css';
import { api, type AreaSearchHit } from '../../api';
import { USE_MOCK } from '../../api/client';
import {
  createAnalysisSession,
  patchAnalysisSessionEvent,
  patchAnalysisSessionStatus,
  patchAnalysisSessionTop3,
  upsertAnalysisSession,
} from '../../features/analysisSessions/store';
import { AnalyzeControlPanel } from '../../features/analyze/components/AnalyzeControlPanel';
import { KakaoCanvas } from '../../features/analyze/components/KakaoCanvas';
import { AnalyzeResultsPanel } from '../../features/analyze/components/AnalyzeResultsPanel';
import {
  DEFAULT_CENTER,
  FALLBACK_BIZ_TYPES,
  FIXED_RADIUS,
  buildCompetitors,
  buildProperties,
  buildPropertiesFromVacancies,
  buildPropertiesFromRecommendations,
  createFallbackArea,
  reverseGeocode,
  type AnalyzeArea,
  type CandidateStatus,
  type AnalyzePhase,
  type AnalyzeProperty,
  type BizKey,
  type BizType,
  type VacancyTransactionType,
} from '../../features/analyze/model';
import {
  useKakaoLoader,
} from 'react-kakao-maps-sdk';

// =============================================================================
//  AnalyzeApp
// =============================================================================
export function Analyze() {
  // Loads kakao SDK once per page; subsequent renders reuse the global script.
  const [sdkLoading, sdkError] = useKakaoLoader({
    appkey: (import.meta.env.VITE_KAKAO_MAP_KEY as string) || '',
    libraries: ['services'],
  });

  const [phase, setPhase] = useState<AnalyzePhase>('idle');
  const [bizType, setBizType] = useState<BizKey | null>(null);
  const [bizTypes, setBizTypes] = useState<BizType[]>(FALLBACK_BIZ_TYPES);
  const [area, setArea] = useState<AnalyzeArea | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState(1);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);
  const [showMarkers, setShowMarkers] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStepLabel, setAnalysisStepLabel] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [recommendedProperties, setRecommendedProperties] = useState<AnalyzeProperty[]>([]);
  const [candidateProperties, setCandidateProperties] = useState<AnalyzeProperty[]>([]);
  const [candidateStatus, setCandidateStatus] = useState<CandidateStatus>('idle');
  const [candidateTotal, setCandidateTotal] = useState(0);
  const [candidateError, setCandidateError] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<VacancyTransactionType>('전체');
  const [budget, setBudget] = useState({
    depositMax: '',
    rentMax: '',
    maintenanceFeeMax: '',
    premiumMax: '',
    salePriceMax: '',
  });
  const trackingCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => {
    trackingCleanupRef.current?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.catalog.listBusinessTypes()
      .then(types => {
        if (!cancelled && types.length > 0) setBizTypes(types);
      })
      .catch(() => {
        if (!cancelled) setBizTypes(FALLBACK_BIZ_TYPES);
      });
    return () => { cancelled = true; };
  }, []);

  const handleBizSelect = (key: BizKey) => {
    setBizType(key);
    setStep(2);
  };

  const handleBudgetChange = (key: keyof typeof budget, value: string) => {
    setBudget(current => ({ ...current, [key]: value }));
  };

  const clearBudget = () => {
    setBudget({ depositMax: '', rentMax: '', maintenanceFeeMax: '', premiumMax: '', salePriceMax: '' });
  };

  const handleTransactionTypeChange = (nextType: VacancyTransactionType) => {
    setTransactionType(nextType);
    clearBudget();
  };

  const handleRadiusChange = (radius: number) => {
    setArea(current => current ? { ...current, radius } : current);
  };

  // Right-clicking the map drops a pin → reverse-geocode → set Area.
  const handlePickLatLng = async (lat: number, lng: number) => {
    const bizLabel = bizTypes.find(b => b.key === bizType)?.label || '';
    const radius = area?.radius ?? FIXED_RADIUS;
    try {
      const next = await reverseGeocode(lat, lng, bizLabel);
      setArea({ ...next, radius });
      setMapCenter({ lat, lng });
    } catch {
      setArea({ ...createFallbackArea(lat, lng, bizLabel), radius });
    }
  };

  // 검색 결과 클릭도 우클릭과 동일하게 "지점 선택" — 마커 + 반경 원이 바로
  // 그려지고 화면은 panTo 로 부드럽게 이동한다.
  const handleSearchPick = (hit: AreaSearchHit) => {
    const bizLabel = bizTypes.find(b => b.key === bizType)?.label || '';
    const lat = hit.center.lat;
    const lng = hit.center.lng;
    setArea({
      id: hit.id,
      lat,
      lng,
      radius: area?.radius ?? FIXED_RADIUS,
      roadAddress: hit.fullName,
      dong: hit.name,
      gu: hit.region,
      displayName: bizLabel ? `${hit.name} ${bizLabel} 입지 분석` : `${hit.name} 일대`,
      regionLabel: hit.name,
    });
    setMapCenter({ lat, lng });
  };

  // Re-label area when biz type changes after a marker is dropped — needs to
  // re-run the reverse-geocode? No — we keep the same coords, just re-derive
  // the displayName label.
  useEffect(() => {
    if (!area) return;
    const bizLabel = bizTypes.find(b => b.key === bizType)?.label || '';
    setArea(a => a ? {
      ...a,
      displayName: bizLabel ? `${a.regionLabel} ${bizLabel} 입지 분석` : `${a.regionLabel} 일대`,
    } : a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizType]);

  useEffect(() => {
    if (!bizType || !area || phase !== 'idle') {
      setCandidateProperties([]);
      setCandidateTotal(0);
      setCandidateStatus('idle');
      setCandidateError(null);
      return;
    }

    if (USE_MOCK) {
      const mockProperties = buildProperties(area).map(property => ({
        ...property,
        transactionType: transactionType === '전체' ? property.transactionType : transactionType,
        recommended: property.rank <= 2,
      }));
      setCandidateProperties(mockProperties);
      setCandidateTotal(mockProperties.length);
      setCandidateStatus('ok');
      setCandidateError(null);
      return;
    }

    let cancelled = false;
    setCandidateStatus('loading');
    setCandidateError(null);
    const timer = window.setTimeout(() => {
      api.vacancies.search({
        categoryId: bizType,
        scoreMode: 'category',
        transactionType: requestTransactionType(transactionType),
        latitude: area.lat,
        longitude: area.lng,
        radiusM: area.radius,
        ...toVacancySearchBudget(budget, transactionType),
        page: 0,
        size: 120,
        sort: 'score_desc',
      })
        .then(result => {
          if (cancelled) return;
          setCandidateProperties(buildPropertiesFromVacancies(result.items));
          setCandidateTotal(result.total);
          setCandidateStatus('ok');
        })
        .catch(error => {
          if (cancelled) return;
          setCandidateProperties([]);
          setCandidateTotal(0);
          setCandidateStatus('error');
          setCandidateError(error instanceof Error ? error.message : '조건에 맞는 공실을 확인하지 못했어요.');
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    area?.id,
    area?.lat,
    area?.lng,
    area?.radius,
    bizType,
    budget.depositMax,
    budget.maintenanceFeeMax,
    budget.premiumMax,
    budget.rentMax,
    budget.salePriceMax,
    phase,
    transactionType,
  ]);

  const runAnalysis = async () => {
    if (!bizType || !area || candidateStatus !== 'ok' || candidateTotal === 0) return;

    trackingCleanupRef.current?.();
    trackingCleanupRef.current = null;
    setPhase('analyzing');
    setAnalysisProgress(0);
    setAnalysisStepLabel('분석 작업을 생성하는 중');
    setAnalysisError(null);
    setShowMarkers(false);
    setRecommendedProperties([]);
    setMapCenter({ lat: area.lat, lng: area.lng });
    try {
      const analysisArea = await resolveAnalysisArea(area);
      if (analysisArea.id !== area.id) {
        setArea(analysisArea);
      }
      const selectedBusiness = bizTypes.find(b => b.key === bizType);
      const budgetRequest = toBudgetRequest(budget, transactionType);
      const result = await api.analyses.create({
        businessType: bizType,
        areaId: analysisArea.id,
        transactionType: requestTransactionType(transactionType),
        budget: budgetRequest,
        center: { lat: analysisArea.lat, lng: analysisArea.lng },
        radiusM: analysisArea.radius,
        roadAddress: analysisArea.roadAddress,
        displayName: analysisArea.displayName,
        region: analysisArea.dong,
        category: selectedBusiness?.label,
        categoryEmoji: selectedBusiness?.emoji,
      });
      const nextProperties = buildPropertiesFromRecommendations(result.recommendations ?? []);
      if (nextProperties.length > 0) {
        setRecommendedProperties(nextProperties);
        setSelected(nextProperties[0].rank);
      }
      setAnalysisId(result.id);
      setAnalysisProgress(result.progress);
      const session = createAnalysisSession({
        response: result,
        businessType: bizType,
        category: selectedBusiness?.label ?? '미지정',
        categoryEmoji: selectedBusiness?.emoji ?? '📍',
        areaId: analysisArea.id,
        areaName: analysisArea.regionLabel,
        region: analysisArea.gu,
        roadAddress: analysisArea.roadAddress,
        lat: analysisArea.lat,
        lng: analysisArea.lng,
        radius: analysisArea.radius,
        budget: budgetRequest,
        recommendations: result.recommendations,
      });
      upsertAnalysisSession(session);
      beginProgressTracking(result.id);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : '분석 작업 생성에 실패했어요.');
      setPhase('failed');
    }
  };

  const resolveAnalysisArea = async (pickedArea: AnalyzeArea): Promise<AnalyzeArea> => {
    if (USE_MOCK || !pickedArea.id.startsWith('coord:')) return pickedArea;

    setAnalysisStepLabel('선택 위치의 행정동을 확인하는 중');
    const queries = [
      pickedArea.dong,
      pickedArea.regionLabel,
      `${pickedArea.gu} ${pickedArea.dong}`.trim(),
      pickedArea.roadAddress,
    ].filter((value, index, values) =>
      value && value !== '미지정' && values.indexOf(value) === index
    );

    for (const query of queries) {
      const matches = await api.catalog.searchAreas(query);
      const match = pickAreaMatch(matches, pickedArea);
      if (match) {
        return {
          ...pickedArea,
          id: match.id,
          roadAddress: match.fullName,
          dong: match.name,
          gu: match.region,
          regionLabel: match.name,
        };
      }
    }

    throw new Error('선택한 위치의 행정동을 서버 지역 목록에서 찾지 못했어요. 근처 장소나 행정동을 검색해서 다시 선택해주세요.');
  };

  const pickAreaMatch = (matches: AreaSearchHit[], pickedArea: AnalyzeArea): AreaSearchHit | undefined => {
    if (matches.length === 0) return undefined;
    const exact = matches.find(match =>
      match.name === pickedArea.dong
      || match.name === pickedArea.regionLabel
      || match.fullName.includes(pickedArea.dong)
    );
    if (exact) return exact;
    return matches[0];
  };

  const beginProgressTracking = (id: string) => {
    let completed = false;
    const finish = () => {
      completed = true;
      setAnalysisProgress(100);
      setAnalysisStepLabel('분석 완료');
      setPhase('done');
      setShowMarkers(true);
      void refreshRecommendations(id);
    };
    const fail = (message: string) => {
      completed = true;
      setAnalysisError(message);
      setPhase('failed');
      setShowMarkers(false);
    };
    const startPolling = () => {
      let cancelled = false;
      const tick = async () => {
        if (cancelled || completed) return;
        try {
          const status = await api.analyses.poll(id);
          patchAnalysisSessionStatus(id, status);
          setAnalysisProgress(status.progress);
          setAnalysisStepLabel(status.step?.label ?? null);
          if (status.status === 'done') {
            finish();
            return;
          }
          if (status.status === 'failed') {
            fail(status.error?.message ?? '분석 작업에 실패했어요.');
            return;
          }
          window.setTimeout(tick, 800);
        } catch (error) {
          fail(error instanceof Error ? error.message : '분석 상태 조회에 실패했어요.');
        }
      };
      tick();
      trackingCleanupRef.current = () => { cancelled = true; };
    };

    trackingCleanupRef.current = api.analyses.subscribeEvents(id, {
      onEvent: event => {
        patchAnalysisSessionEvent(id, event);
        setAnalysisProgress(event.progress);
        setAnalysisStepLabel(event.step?.label ?? null);
        if (event.status === 'done') finish();
        if (event.status === 'failed') fail(event.error?.message ?? '분석 작업에 실패했어요.');
      },
      onError: () => {
        if (!completed) startPolling();
      },
    });
  };

  const refreshRecommendations = async (id: string) => {
    if (USE_MOCK) return;
    try {
      const section = await api.analyses.recommendations(id);
      const nextProperties = buildPropertiesFromRecommendations(section.recommendations);
      if (nextProperties.length === 0) return;
      setRecommendedProperties(nextProperties);
      setSelected(current => nextProperties.some(property => property.rank === current)
        ? current
        : nextProperties[0].rank);
      patchAnalysisSessionTop3(id, section.recommendations);
    } catch {
      // The create response already carries recommendations; keep those visible.
    }
  };

  const reset = () => {
    setPhase('idle');
    setBizType(null);
    setArea(null);
    setStep(1);
    setShowMarkers(false);
    setMapCenter(DEFAULT_CENTER);
    setAnalysisId(null);
    setAnalysisProgress(0);
    setAnalysisStepLabel(null);
    setAnalysisError(null);
    setRecommendedProperties([]);
    setCandidateProperties([]);
    setCandidateTotal(0);
    setCandidateStatus('idle');
    setCandidateError(null);
    setTransactionType('전체');
    clearBudget();
    trackingCleanupRef.current?.();
    trackingCleanupRef.current = null;
  };

  const selectedBiz = bizTypes.find(b => b.key === bizType);

  // Synthesised demo coords. Memo so the same object reference is shared
  // across renders (avoids unnecessary marker re-mounts).
  const propertiesCenter = area ?? DEFAULT_CENTER;
  const properties = useMemo(
    () => {
      if (recommendedProperties.length > 0) return recommendedProperties;
      return USE_MOCK ? buildProperties(propertiesCenter) : [];
    },
    [recommendedProperties, propertiesCenter.lat, propertiesCenter.lng],
  );
  const competitors = useMemo(
    () => buildCompetitors(propertiesCenter),
    [propertiesCenter.lat, propertiesCenter.lng],
  );
  const canRunAnalysis = !!bizType && !!area && candidateStatus === 'ok' && candidateTotal > 0;

  return (
    <div className="analyze-shell">
      {sdkError ? (
        <div className="kakao-map" style={{ display: 'grid', placeItems: 'center', color: '#6B7490' }}>
          지도를 불러오지 못했어요. VITE_KAKAO_MAP_KEY 와 사이트 도메인 등록을 확인해주세요.
        </div>
      ) : sdkLoading ? (
        <div className="kakao-map" style={{ display: 'grid', placeItems: 'center', color: '#6B7490' }}>
          지도를 불러오는 중…
        </div>
      ) : (
        <KakaoCanvas
          center={mapCenter}
          area={area}
          properties={properties}
          candidateProperties={phase === 'idle' ? candidateProperties : []}
          candidateStatus={candidateStatus}
          competitors={competitors}
          showMarkers={showMarkers}
          selected={selected}
          setSelected={setSelected}
          phase={phase}
          step={step}
          bizTypeReady={!!bizType}
          onPickLatLng={handlePickLatLng}
        />
      )}

      <AnalyzeControlPanel
        phase={phase}
        step={step}
        setStep={setStep}
        bizType={bizType}
        selectedBiz={selectedBiz}
        onBizSelect={handleBizSelect}
        bizTypes={bizTypes}
        area={area}
        budget={budget}
        transactionType={transactionType}
        onTransactionTypeChange={handleTransactionTypeChange}
        onBudgetChange={handleBudgetChange}
        onClearBudget={clearBudget}
        onRadiusChange={handleRadiusChange}
        onSearchPan={handleSearchPick}
        onRun={runAnalysis}
        canRun={canRunAnalysis}
        candidateStatus={candidateStatus}
        candidateCount={candidateTotal}
        candidateError={candidateError}
        onReset={reset}
        analysisProgress={analysisProgress}
        analysisStepLabel={analysisStepLabel}
        analysisError={analysisError}
      />

      {phase === 'done' && (
        <AnalyzeResultsPanel
          properties={properties}
          selected={selected}
          setSelected={setSelected}
          selectedBiz={selectedBiz}
          area={area}
          analysisId={analysisId}
          onClose={reset}
        />
      )}
    </div>
  );
}

function toBudgetRequest(budget: {
  depositMax: string;
  rentMax: string;
  maintenanceFeeMax: string;
  premiumMax: string;
  salePriceMax: string;
}, transactionType: VacancyTransactionType = '전체') {
  if (transactionType === '전체') return undefined;

  const next = {
    depositMax: transactionType !== '매매' ? toOptionalNumber(budget.depositMax) : undefined,
    rentMax: transactionType === '임대' ? toOptionalNumber(budget.rentMax) : undefined,
    maintenanceFeeMax: toOptionalNumber(budget.maintenanceFeeMax),
    premiumMax: transactionType !== '매매' ? toOptionalNumber(budget.premiumMax) : undefined,
    salePriceMax: transactionType === '매매' ? toOptionalNumber(budget.salePriceMax) : undefined,
  };
  const entries = Object.entries(next).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as {
    depositMax?: number;
    rentMax?: number;
    maintenanceFeeMax?: number;
    premiumMax?: number;
    salePriceMax?: number;
  };
}

function requestTransactionType(transactionType: VacancyTransactionType): string | undefined {
  return transactionType === '전체' ? undefined : transactionType;
}

function toVacancySearchBudget(
  budget: {
    depositMax: string;
    rentMax: string;
    maintenanceFeeMax: string;
    premiumMax: string;
    salePriceMax: string;
  },
  transactionType: VacancyTransactionType,
) {
  return toBudgetRequest(budget, transactionType) ?? {};
}

function toOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
