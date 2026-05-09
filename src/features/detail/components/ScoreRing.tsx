type ScoreRingProps = {
  score: number;
  size?: number;
  stroke?: number;
  rank?: number;
  showLabel?: boolean;
};

export function ScoreRing({ score, size = 160, stroke = 14, rank = 1, showLabel = false }: ScoreRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(score / 100, 1);
  const trackDash = circumference * 0.78;
  const dash = trackDash * percent;
  const colors: Record<number, string> = { 1: '#E85D1F', 2: '#F4B431', 3: '#3B6FE8' };
  const color = colors[rank] || '#E85D1F';

  return (
    <div className="dt-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#EEF1F7"
          strokeWidth={stroke}
          strokeDasharray={`${trackDash} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(130 ${size / 2} ${size / 2})`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(130 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="dt-ring-center">
        <div className="dt-ring-val" style={{ color, fontSize: size * 0.28 }}>
          {score}<span style={{ fontSize: size * 0.13 }}>%</span>
        </div>
        {showLabel && <div className="dt-ring-lab">생존율</div>}
      </div>
    </div>
  );
}
