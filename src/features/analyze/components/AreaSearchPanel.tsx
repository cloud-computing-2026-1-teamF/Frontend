import { useEffect, useState } from 'react';
import { api, type AreaSearchHit } from '../../../api';
import { Icon } from '../../../shared/Icon';
import { type AnalyzeArea } from '../model';

type AreaSearchPanelProps = {
  area: AnalyzeArea | null;
  onSearchPan: (place: AreaSearchHit) => void;
};

export function AreaSearchPanel({ area, onSearchPan }: AreaSearchPanelProps) {
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState<AreaSearchHit[]>([]);

  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) {
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
  }, [q]);

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
          <div className="lf-pick-summary-ico"><Icon name="map-pin" size={13} /></div>
          <div className="lf-pick-summary-copy">
            <div className="lf-pick-summary-val">{area.dong}</div>
            <div className="lf-pick-summary-sub">
              {area.roadAddress} · 반경 {area.radius.toLocaleString()}m
            </div>
          </div>
        </div>
      )}
    </>
  );
}
