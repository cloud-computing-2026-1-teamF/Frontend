import type { Top3Item } from '../../../lib/savedAnalyses';

type RiskLevel = 'low' | 'medium' | 'high';
type Tone = 'up' | 'down';

type RiskSummaryProps = {
  sel: Top3Item;
  selRank: number;
};

export function RiskSummary({ sel, selRank }: RiskSummaryProps) {
  const refs = { foot: 7500, comp: 5, rev: 1500 };
  const footDiff = Math.round((sel.foot - refs.foot) / refs.foot * 100);
  const revDiff = Math.round((sel.rev - refs.rev) / refs.rev * 100);
  const compGap = sel.comp - refs.comp;

  const factors: { lab: string; tone: Tone; headline: string; score: number }[] = [
    {
      lab: '유동인구',
      tone: footDiff >= 0 ? 'up' : 'down',
      headline: footDiff >= 0 ? `업종 평균보다 ${footDiff}% 많아요` : `업종 평균보다 ${Math.abs(footDiff)}% 적어요`,
      score: footDiff >= 10 ? 1 : footDiff >= -10 ? 0 : -1,
    },
    {
      lab: '경쟁 밀도',
      tone: compGap <= 0 ? 'up' : 'down',
      headline: compGap <= 0
        ? `분석 반경 내 ${sel.comp}곳으로 적정 수준이에요`
        : `분석 반경 내 ${sel.comp}곳으로 다소 밀집돼 있어요`,
      score: compGap <= 0 ? 1 : compGap <= 2 ? 0 : -1,
    },
    {
      lab: '동네 평균 추정 매출',
      tone: revDiff >= 0 ? 'up' : 'down',
      headline: revDiff >= 0
        ? `업종 평균 대비 +${revDiff}% 수준의 매출이 예상돼요`
        : `업종 평균 대비 ${revDiff}% 낮은 매출이 예상돼요`,
      score: revDiff >= 10 ? 1 : revDiff >= -10 ? 0 : -1,
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
