import { useEffect, useState } from 'react';
import { api, type AreaSearchHit } from '../../../api';
import { Icon } from '../../../shared/Icon';
import { FIXED_RADIUS, type AnalyzeArea } from '../model';

type AreaSearchPanelProps = {
  area: AnalyzeArea | null;
  onClearArea: () => void;
  onSearchPan: (place: AreaSearchHit) => void;
  sdkReady: boolean;
};

export function AreaSearchPanel({ area, onClearArea, onSearchPan, sdkReady }: AreaSearchPanelProps) {
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState<AreaSearchHit[]>([]);

  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed || !sdkReady) {
      setMatches([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      api.catalog.searchAreas(trimmed)
        .then(data => {
          if (cancelled) return;
          setMatches(data.slice(0, 6));
        })
        .catch(() => {
          if (cancelled) return;
          setMatches([]);
        });
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, sdkReady]);

  const handleSearchClick = (place: AreaSearchHit) => {
    onSearchPan(place);
    setQ('');
  };

  return (
    <>
      <div className="lf-mapsearch">
        <div className="lf-mapsearch-input">
          <span className="lf-mapsearch-icon"><Icon name="search" size={14} /></span>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="장소·주소·지하철역 검색"
          />
          {q && (
            <button className="lf-mapsearch-clear" onClick={() => setQ('')}>
              <Icon name="close" size={12} />
            </button>
          )}
        </div>
        {matches.length > 0 && (
          <ul className="lf-mapsearch-list">
            {matches.map((place, index) => (
              <li key={index} onClick={() => handleSearchClick(place)}>
                <div className="lf-mapsearch-ico"><Icon name="map-pin" size={12} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="lf-mapsearch-name">{place.name}</div>
                  <div className="lf-mapsearch-meta">{place.region} · {place.fullName}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {q.trim().length > 0 && matches.length === 0 && (
          <div className="lf-mapsearch-empty">검색 결과가 없어요</div>
        )}
      </div>

      {!area ? (
        <div className="lf-pick-hint">
          <div className="lf-pick-hint-ico"><Icon name="map-pin" size={16} /></div>
          <div className="lf-pick-hint-body">
            <div className="lf-pick-hint-title">지도에서 위치를 찍어주세요</div>
            <div className="lf-pick-hint-sub">
              검색으로 위치를 찾거나, 지도를 드래그해 움직인 뒤<br />
              <b>우클릭</b>으로 분석할 지점을 선택하면 돼요.
            </div>
          </div>
        </div>
      ) : (
        <div className="lf-pick-summary">
          <div className="lf-pick-summary-row">
            <span className="lf-pick-summary-lab">선택 위치</span>
            <span className="lf-pick-summary-val">{area.roadAddress}</span>
          </div>
          <div className="lf-pick-summary-row">
            <span className="lf-pick-summary-lab">행정동</span>
            <span className="lf-pick-summary-val">{area.dong}</span>
          </div>
          <div className="lf-pick-summary-row">
            <span className="lf-pick-summary-lab">분석 반경</span>
            <span className="lf-pick-summary-val">{FIXED_RADIUS}m</span>
          </div>
          <button className="lf-pick-clear" onClick={onClearArea}>
            <Icon name="close" size={11} /> 마커 다시 찍기
          </button>
        </div>
      )}

      <div style={{ fontSize: 10, color: '#9AA3BD', marginTop: 10, display: 'flex', alignItems: 'center', gap: 4, lineHeight: 1.5 }}>
        <Icon name="info" size={11} />
        도로명 주소·실좌표로 거리 계산 → 반경 {FIXED_RADIUS}m 내 공실매물만 분석해요
      </div>
    </>
  );
}
