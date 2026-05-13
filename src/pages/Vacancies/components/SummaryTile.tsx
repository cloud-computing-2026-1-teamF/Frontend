import { Icon } from '../../../shared/Icon';

type SummaryTileProps = {
  icon: string;
  label: string;
  value: string;
  unit: string;
  tone?: 'brand' | 'blue' | 'teal' | 'amber';
  loading?: boolean;
};

export function SummaryTile({ icon, label, value, unit, tone = 'brand', loading = false }: SummaryTileProps) {
  return (
    <div className={`vacancy-summary-tile tone-${tone} ${loading ? 'is-loading' : ''}`}>
      <div className="vacancy-summary-icon"><Icon name={icon} size={18} /></div>
      <div>
        <div className="vacancy-summary-label">{label}</div>
        <div className="vacancy-summary-value">
          {loading ? (
            <>
              <span className="vacancy-summary-skeleton" />
              <small className="vacancy-summary-skeleton small" />
            </>
          ) : (
            <>
              <span>{value}</span>
              <small>{unit}</small>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
