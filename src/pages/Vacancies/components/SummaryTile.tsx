import { Icon } from '../../../shared/Icon';

type SummaryTileProps = {
  icon: string;
  label: string;
  value: string;
  unit: string;
  tone?: 'brand' | 'blue' | 'teal' | 'amber';
};

export function SummaryTile({ icon, label, value, unit, tone = 'brand' }: SummaryTileProps) {
  return (
    <div className={`vacancy-summary-tile tone-${tone}`}>
      <div className="vacancy-summary-icon"><Icon name={icon} size={18} /></div>
      <div>
        <div className="vacancy-summary-label">{label}</div>
        <div className="vacancy-summary-value">
          <span>{value}</span>
          <small>{unit}</small>
        </div>
      </div>
    </div>
  );
}

