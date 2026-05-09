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
  createFallbackArea,
  reverseGeocode,
  type AnalyzeArea,
  type AnalyzePhase,
  type BizKey,
  type BizType,
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

  // Right-clicking the map drops a pin → reverse-geocode → set Area.
  const handlePickLatLng = async (lat: number, lng: number) => {
    const bizLabel = bizTypes.find(b => b.key === bizType)?.label || '';
    try {
      const next = await reverseGeocode(lat, lng, bizLabel);
      setArea(next);
      setMapCenter({ lat, lng });
    } catch {
      setArea(createFallbackArea(lat, lng, bizLabel));
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
      radius: FIXED_RADIUS,
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

  const runAnalysis = async () => {
    if (!bizType || !area) return;

    trackingCleanupRef.current?.();
    trackingCleanupRef.current = null;
    setPhase('analyzing');
    setAnalysisProgress(0);
    setAnalysisStepLabel('분석 작업을 생성하는 중');
    setAnalysisError(null);
    setShowMarkers(false);
    setMapCenter({ lat: area.lat, lng: area.lng });
    try {
      const analysisArea = await resolveAnalysisArea(area);
      if (analysisArea.id !== area.id) {
        setArea(analysisArea);
      }
      const selectedBusiness = bizTypes.find(b => b.key === bizType);
      const result = await api.analyses.create({
        businessType: bizType,
        areaId: analysisArea.id,
        center: { lat: analysisArea.lat, lng: analysisArea.lng },
        radiusM: FIXED_RADIUS,
        roadAddress: analysisArea.roadAddress,
        displayName: analysisArea.displayName,
        region: analysisArea.dong,
        category: selectedBusiness?.label,
        categoryEmoji: selectedBusiness?.emoji,
      });
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
        radius: FIXED_RADIUS,
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
    trackingCleanupRef.current?.();
    trackingCleanupRef.current = null;
  };

  const selectedBiz = bizTypes.find(b => b.key === bizType);

  // Synthesised demo coords. Memo so the same object reference is shared
  // across renders (avoids unnecessary marker re-mounts).
  const propertiesCenter = area ?? DEFAULT_CENTER;
  const properties = useMemo(
    () => buildProperties(propertiesCenter),
    [propertiesCenter.lat, propertiesCenter.lng],
  );
  const competitors = useMemo(
    () => buildCompetitors(propertiesCenter),
    [propertiesCenter.lat, propertiesCenter.lng],
  );

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
        onClearArea={() => setArea(null)}
        onSearchPan={handleSearchPick}
        onRun={runAnalysis}
        onReset={reset}
        sdkReady={!sdkLoading && !sdkError}
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
