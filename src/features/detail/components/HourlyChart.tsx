type HourlyChartProps = {
  data: number[];
  color: string;
};

export function HourlyChart({ data, color }: HourlyChartProps) {
  const max = Math.max(...data);

  return (
    <div className="dt-hourly">
      <div className="dt-hourly-bars">
        {data.map((value, index) => (
          <div key={index} className="dt-hourly-bar-wrap">
            <div className="dt-hourly-bar" style={{ height: `${(value / max) * 100}%`, background: color }} />
          </div>
        ))}
      </div>
      <div className="dt-hourly-axis">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
      </div>
    </div>
  );
}
