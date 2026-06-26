import { useEffect, useState } from 'react';
import { Roadview, RoadviewMarker, useKakaoLoader } from 'react-kakao-maps-sdk';
import { Icon } from './Icon';
import './roadview.css';

export type RoadviewTarget = {
  id: string;
  latitude?: number | null;
  longitude?: number | null;
  title: string;
  subtitle?: string | null;
};

type RoadviewModalProps = {
  target: RoadviewTarget;
  open: boolean;
  onClose: () => void;
};

// 좌표(lat/lng)를 카카오 로드뷰 위젯으로 팝업에 실시간 임베드한다.
// 이미지를 저장/재호스팅하지 않으므로 약관 위반 소지가 없다.
// 공실 상세·분석 상세 등 여러 페이지에서 공유한다.
export function RoadviewModal({ target, open, onClose }: RoadviewModalProps) {
  const [sdkLoading, sdkError] = useKakaoLoader({
    appkey: (import.meta.env.VITE_KAKAO_MAP_KEY as string) || '',
    libraries: ['services'],
  });
  const [noPano, setNoPano] = useState(false);

  const hasCoord =
    typeof target.latitude === 'number' && typeof target.longitude === 'number';

  // 모달을 새로 열거나 대상이 바뀌면 폴백 상태를 초기화한다.
  useEffect(() => {
    if (open) setNoPano(false);
  }, [open, target.id]);

  // ESC 닫기 + 배경 스크롤 잠금.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const lat = target.latitude as number;
  const lng = target.longitude as number;
  const kakaoMapLink = hasCoord
    ? `https://map.kakao.com/link/map/${encodeURIComponent(target.title)},${lat},${lng}`
    : 'https://map.kakao.com';

  return (
    <div
      className="vf-rv-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${target.title} 로드뷰`}
      onClick={onClose}
    >
      <div className="vf-rv-modal" onClick={event => event.stopPropagation()}>
        <header className="vf-rv-head">
          <div className="vf-rv-title">
            <h2>{target.title}</h2>
            {target.subtitle && <p>{target.subtitle}</p>}
          </div>
          <button type="button" className="vf-rv-close" onClick={onClose} aria-label="닫기">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="vf-rv-body">
          {!hasCoord && (
            <div className="vf-rv-state">
              <Icon name="info" size={22} />
              <p>이 위치는 좌표를 찾지 못해 로드뷰를 표시할 수 없어요.</p>
            </div>
          )}
          {hasCoord && sdkLoading && (
            <div className="vf-rv-state">카카오 로드뷰를 불러오는 중…</div>
          )}
          {hasCoord && sdkError && (
            <div className="vf-rv-state">
              <Icon name="info" size={22} />
              <p>로드뷰 SDK를 불러오지 못했어요. VITE_KAKAO_MAP_KEY 와 사이트 도메인 등록을 확인해주세요.</p>
            </div>
          )}
          {hasCoord && noPano && (
            <div className="vf-rv-state">
              <Icon name="info" size={22} />
              <p>이 위치는 로드뷰가 제공되지 않아요.</p>
              <a className="vf-rv-link" href={kakaoMapLink} target="_blank" rel="noreferrer">
                카카오맵에서 위치 보기
              </a>
            </div>
          )}
          {hasCoord && !sdkLoading && !sdkError && !noPano && (
            <Roadview
              position={{ lat, lng, radius: 100 }}
              style={{ width: '100%', height: '100%' }}
              onErrorGetNearestPanoId={() => setNoPano(true)}
            >
              <RoadviewMarker position={{ lat, lng }} />
            </Roadview>
          )}
        </div>

        <footer className="vf-rv-foot">
          <span className="vf-rv-attr">카카오 로드뷰</span>
          <a className="vf-rv-foot-link" href={kakaoMapLink} target="_blank" rel="noreferrer">
            카카오맵에서 보기 <Icon name="external" size={14} />
          </a>
        </footer>
      </div>
    </div>
  );
}
