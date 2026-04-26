// Factor visualizations — shared between the analyze side panel and the
// history detail page. Each indicator gets its own viz that matches the
// shape of the underlying number (absolute count vs zone vs percentile vs
// signed). Donut charts were dropped because the value/whole ratio they
// imply has no real meaning here.
//
// Reference values (industry averages, zone thresholds) are mocked in
// buildFactorViz() — replace with API-supplied reference values when the
// analysis service starts returning them.
import type { ReactNode } from 'react';

export type Property = {
  foot: number;
  comp: number;
  rev: number;
  growth: number;
  // …other fields exist on real data but the viz only needs the four above
};

type Tone = 'up' | 'down' | 'flat';
type Badge = { label: string; tone: Tone };

const formatSigned = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

// 1) 유동인구 — value vs industry average bar
function BarVsAverage({ value, max, avg, avgLabel = '업종 평균' }: {
  value: number; max: number; avg: number; avgLabel?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const avgPct = Math.min(100, Math.max(0, (avg / max) * 100));
  const above = value >= avg;
  return (
    <div className="fv-viz fv-bar-avg">
      <div className="fv-axis">
        <span>0</span>
        <span>{max.toLocaleString()}</span>
      </div>
      <div className="fv-bar-track">
        <div className={`fv-bar-fill ${above ? 'is-up' : 'is-down'}`} style={{ width: `${pct}%` }} />
        <div className="fv-bar-marker" style={{ left: `${avgPct}%` }}>
          <div className="fv-bar-marker-lab">{avgLabel}</div>
        </div>
      </div>
    </div>
  );
}

// 2) 경쟁점포 — three-zone strip with current position marker
function ZoneStrip({ value, ideal = [2, 5], softMax = 10 }: {
  value: number; ideal?: [number, number]; softMax?: number;
}) {
  const [lo, hi] = ideal;
  const pct = Math.min(100, Math.max(0, (value / softMax) * 100));
  return (
    <div className="fv-viz fv-zone">
      <div className="fv-zone-track">
        <div className="fv-zone-seg fv-zone-low" style={{ flex: lo }} />
        <div className="fv-zone-seg fv-zone-mid" style={{ flex: hi - lo }} />
        <div className="fv-zone-seg fv-zone-high" style={{ flex: softMax - hi }} />
        <div className="fv-zone-marker" style={{ left: `${pct}%` }} />
      </div>
      <div className="fv-zone-labs">
        <span><b>과소</b><i>0–{lo - 1}</i></span>
        <span><b>적정</b><i>{lo}–{hi}</i></span>
        <span><b>과밀</b><i>{hi + 1}+</i></span>
      </div>
    </div>
  );
}

// 3) 추정 월매출 — 0..100 percentile bar
function PercentileBar({ percentile }: { percentile: number }) {
  const p = Math.min(99, Math.max(1, Math.round(percentile)));
  return (
    <div className="fv-viz fv-pct">
      <div className="fv-axis">
        <span>하위</span>
        <span>상위</span>
      </div>
      <div className="fv-pct-track">
        <div className="fv-pct-fill" style={{ width: `${p}%` }} />
      </div>
      <div className="fv-pct-foot">{p}번째 백분위</div>
    </div>
  );
}

// 4) 업종 성장률 — symmetric bar pivoting around 0
function SignedBar({ value, range = [-20, 20] }: { value: number; range?: [number, number] }) {
  const [min, max] = range;
  const span = max - min;
  const zeroPct = (-min / span) * 100;
  const positive = value >= 0;
  const v = Math.min(max, Math.max(min, value));
  const valuePct = ((v - min) / span) * 100;
  const left = Math.min(zeroPct, valuePct);
  const width = Math.abs(valuePct - zeroPct);
  return (
    <div className="fv-viz fv-signed">
      <div className="fv-axis">
        <span>{formatSigned(min)}%</span>
        <span>0</span>
        <span>{formatSigned(max)}%</span>
      </div>
      <div className="fv-signed-track">
        <div className="fv-signed-zero" style={{ left: `${zeroPct}%` }} />
        <div className={`fv-signed-fill ${positive ? 'is-up' : 'is-down'}`}
          style={{ left: `${left}%`, width: `${width}%` }} />
      </div>
    </div>
  );
}

export type FactorCardProps = {
  title: string;
  subtitle: string;
  value: ReactNode;
  unit?: string | null;
  badge?: Badge;
  viz?: ReactNode;
  desc?: string;
};

export function FactorCard({ title, subtitle, value, unit, badge, viz, desc }: FactorCardProps) {
  return (
    <div className="fv-card">
      <div className="fv-card-head">
        <div className="fv-card-title">{title}</div>
        <div className="fv-card-sub">{subtitle}</div>
      </div>
      <div className="fv-value-row">
        <span className="fv-value">{value}</span>
        {unit && <span className="fv-unit">{unit}</span>}
      </div>
      {badge && (
        <div className={`fv-badge fv-badge-${badge.tone}`}>
          <span className="fv-badge-dot" />
          <span>{badge.label}</span>
        </div>
      )}
      {viz}
      {desc && <p className="fv-desc">{desc}</p>}
    </div>
  );
}

export function buildFactorViz(sel: Property): (FactorCardProps & { key: string })[] {
  const REFS = {
    foot:   { avg: 7500, max: 15000 },
    comp:   { ideal: [2, 5] as [number, number], soft_max: 10 },
    rev:    { avg: 1500 },
    growth: { range: [-20, 20] as [number, number] },
  };

  const footDelta = sel.foot - REFS.foot.avg;
  const footPct = Math.round((footDelta / REFS.foot.avg) * 100);
  const footAbove = footDelta >= 0;

  const compInside = sel.comp >= REFS.comp.ideal[0] && sel.comp <= REFS.comp.ideal[1];
  const compTone: Tone = compInside ? 'flat' : (sel.comp < REFS.comp.ideal[0] ? 'up' : 'down');
  const compLabel = compInside ? '밀집도 적정' : (sel.comp < REFS.comp.ideal[0] ? '경쟁 적음' : '밀집도 높음');

  const rawPct = 50 + ((sel.rev - REFS.rev.avg) / 100) * 7.5;
  const percentile = Math.min(99, Math.max(1, Math.round(rawPct)));
  const upperPct = 100 - percentile;

  const growthTone: Tone = sel.growth >= 8 ? 'up' : sel.growth >= 0 ? 'flat' : 'down';
  const growthLabel = sel.growth >= 8 ? '안정 성장' : sel.growth >= 0 ? '완만한 성장' : '성장 둔화';

  return [
    {
      key: 'foot',
      title: '유동인구',
      subtitle: '하루 평균',
      value: sel.foot.toLocaleString(),
      unit: '명/일',
      badge: { label: `업종 평균 대비 ${formatSigned(footPct)}%`, tone: footAbove ? 'up' : 'down' },
      viz: <BarVsAverage value={sel.foot} max={REFS.foot.max} avg={REFS.foot.avg} />,
      desc: `업종 평균보다 ${Math.abs(footDelta).toLocaleString()}명 ${footAbove ? '더' : '덜'} 지나가요.`,
    },
    {
      key: 'comp',
      title: '경쟁점포',
      subtitle: '반경 500m',
      value: sel.comp,
      unit: '곳',
      badge: { label: compLabel, tone: compTone },
      viz: <ZoneStrip value={sel.comp} ideal={REFS.comp.ideal} softMax={REFS.comp.soft_max} />,
      desc: compInside
        ? '같은 업종이 적정 수준으로 분포해 경쟁이 과하지 않아요.'
        : (sel.comp < REFS.comp.ideal[0]
            ? '동일 업종 매장이 적어 진입 여지가 있어요.'
            : '동일 업종 매장이 많아 경쟁이 치열할 수 있어요.'),
    },
    {
      key: 'rev',
      title: '추정 월매출',
      subtitle: '동일 업종 기준',
      value: sel.rev.toLocaleString(),
      unit: '만원',
      badge: { label: `상권 내 상위 ${upperPct}%`, tone: percentile >= 50 ? 'up' : 'down' },
      viz: <PercentileBar percentile={percentile} />,
      desc: `주변 동일 업종 대비 상위 ${upperPct}%에 해당하는 매출이 예상돼요.`,
    },
    {
      key: 'growth',
      title: '업종 성장률',
      subtitle: '전년 대비 (YoY)',
      value: `${formatSigned(sel.growth)}%`,
      unit: null,
      badge: { label: growthLabel, tone: growthTone },
      viz: <SignedBar value={sel.growth} range={REFS.growth.range} />,
      desc: sel.growth >= 0
        ? '해당 업종은 전년 대비 꾸준히 성장하는 흐름을 보여요.'
        : '해당 업종은 전년 대비 성장세가 둔화됐어요.',
    },
  ];
}
