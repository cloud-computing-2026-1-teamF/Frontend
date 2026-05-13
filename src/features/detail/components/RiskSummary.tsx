import type { Top3Item } from '../../../lib/savedAnalyses';
import type { VacancyMetricDistribution, VacancyMetricReference } from '../../../api';

type RiskLevel = 'low' | 'medium' | 'high';
type Tone = 'up' | 'down';

type RiskSummaryProps = {
  sel: Top3Item;
  selRank: number;
  metricReference?: VacancyMetricReference | null;
};

export function RiskSummary({ sel, selRank, metricReference }: RiskSummaryProps) {
  const foot = summarizeHigherBetter(metricReference?.footTrafficDaily, sel.foot, '명');
  const comp = summarizeLowerBetter(metricReference?.competition500m, sel.comp, '곳');
  const rev = summarizeHigherBetter(metricReference?.averageSalesMonthly, sel.rev, '만원');

  const factors: { lab: string; tone: Tone; headline: string; score: number }[] = [
    {
      lab: '유동인구',
      tone: foot.tone,
      headline: foot.headline,
      score: foot.score,
    },
    {
      lab: '경쟁 밀도',
      tone: comp.tone,
      headline: comp.headline,
      score: comp.score,
    },
    {
      lab: '동네 평균 추정 매출',
      tone: rev.tone,
      headline: rev.headline,
      score: rev.score,
    },
  ];

  const totalScore = factors.reduce((sum, factor) => sum + factor.score, 0);
  const level: RiskLevel = totalScore >= 2 ? 'low' : totalScore >= 0 ? 'medium' : 'high';
  const title = {
    low: '전반적으로 안정적인 입지예요',
    medium: '일부 주의할 요소가 있어요',
    high: '리스크 요소가 많으니 신중하게 검토하세요',
  }[level];

  return (
    <div className={`dt-risk dt-risk-${level}`}>
      <div className="dt-risk-head">
        <div className={`dt-risk-badge dt-risk-badge-${level}`}>
          {level === 'low' ? '낮음' : level === 'medium' ? '보통' : '높음'}
        </div>
        <div>
          <div className="dt-risk-title">{title}</div>
          <div className="dt-risk-sub">생존율 {sel.score}% · Top {selRank} 공실매물 기준 · 주요 지표 3개 요약</div>
        </div>
      </div>
      <ul className="dt-risk-list">
        {factors.map((factor, index) => (
          <li key={index} className={`dt-risk-item tone-${factor.tone}`}>
            <span className={`dt-risk-bullet tone-${factor.tone}`} />
            <div className="dt-risk-item-body">
              <span className="dt-risk-item-lab">{factor.lab}</span>
              <span className="dt-risk-item-headline">{factor.headline}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function summarizeHigherBetter(
  distribution: VacancyMetricDistribution | undefined,
  fallbackSelected: number,
  unit: string,
): { tone: Tone; headline: string; score: number } {
  const selected = toNumber(distribution?.selected) ?? fallbackSelected;
  const average = toNumber(distribution?.average);
  if (average == null || average <= 0) {
    return { tone: 'down', headline: '동일 업종 비교 기준을 불러오는 중이에요', score: 0 };
  }
  const percent = Math.round(((selected - average) / average) * 100);
  const above = selected >= average;
  const percentile = percentileSuffix(distribution?.percentile);
  return {
    tone: above ? 'up' : 'down',
    headline: `평균 ${formatMetric(average, unit)}보다 ${Math.abs(percent)}% ${above ? '높아요' : '낮아요'}${percentile}`,
    score: percent >= 10 ? 1 : percent >= -10 ? 0 : -1,
  };
}

function summarizeLowerBetter(
  distribution: VacancyMetricDistribution | undefined,
  fallbackSelected: number,
  unit: string,
): { tone: Tone; headline: string; score: number } {
  const selected = toNumber(distribution?.selected) ?? fallbackSelected;
  const average = toNumber(distribution?.average);
  if (average == null || average <= 0) {
    return { tone: 'down', headline: '동일 업종 비교 기준을 불러오는 중이에요', score: 0 };
  }
  const delta = Math.round(selected - average);
  const percent = Math.round((delta / average) * 100);
  const lower = selected <= average;
  const percentile = percentileSuffix(distribution?.percentile);
  return {
    tone: lower ? 'up' : 'down',
    headline: `평균 ${formatMetric(average, unit)}보다 ${formatMetric(Math.abs(delta), unit)} ${lower ? '적어요' : '많아요'}${percentile}`,
    score: percent <= -10 ? 1 : percent <= 10 ? 0 : -1,
  };
}

function percentileSuffix(value: number | null | undefined): string {
  const percentile = toNumber(value);
  return percentile == null ? '' : ` · P${Math.round(percentile)}`;
}

function toNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatMetric(value: number, unit: string): string {
  return `${Math.round(value).toLocaleString()}${unit}`;
}
