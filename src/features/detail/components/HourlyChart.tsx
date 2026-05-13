type HourlyChartProps = {
  data: number[];
  color: string;
};

export function HourlyChart({ data, color }: HourlyChartProps) {
  const values = data.length > 0 ? data : Array.from({ length: 24 }, () => 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const minHeight = max === min ? 42 : 12;

  return (
    <div className="dt-hourly">
      <div className="dt-hourly-bars">
        {values.map((value, index) => {
          const height = max === min
            ? minHeight
            : minHeight + ((value - min) / range) * (100 - minHeight);
          return (
            <div key={index} className="dt-hourly-bar-wrap">
              <div
                className="dt-hourly-bar"
                style={{ height: `${height}%`, background: color }}
                title={`${String(index).padStart(2, '0')}시 ${value.toLocaleString()}명`}
              />
            </div>
          );
        })}
      </div>
      <div className="dt-hourly-axis">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
    </div>
  );
}
