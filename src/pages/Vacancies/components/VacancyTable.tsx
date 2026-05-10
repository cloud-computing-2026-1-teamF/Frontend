import type { KeyboardEvent } from 'react';
import type { Vacancy } from '../../../api';
import {
  formatArea,
  formatCount,
  formatLargeManWon,
  formatManWon,
  formatPeople,
  formatScore,
  scoreClass,
} from '../model';

type VacancyTableProps = {
  items: Vacancy[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function VacancyTable({ items, selectedId, onSelect }: VacancyTableProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') onSelect(id);
  };

  return (
    <div className="vacancy-table-wrap">
      <table className="vacancy-table">
        <thead>
          <tr>
            <th>공실</th>
            <th>점수</th>
            <th>임대 조건</th>
            <th>면적</th>
            <th>경쟁</th>
            <th>유동</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const selected = item.id === selectedId;
            return (
              <tr
                key={item.id}
                className={selected ? 'is-selected' : ''}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(item.id)}
                onKeyDown={event => handleKeyDown(event, item.id)}
              >
                <td>
                  <div className="vacancy-row-title">{item.businessSubCategoryName ?? item.id}</div>
                  <div className="vacancy-row-sub">{item.areaId} · {item.businessMiddleCategoryName ?? item.category ?? '업종 미분류'}</div>
                </td>
                <td>
                  <span className={`vacancy-score-badge ${scoreClass(item.survivalScore)}`}>
                    {formatScore(item.survivalScore)}
                  </span>
                </td>
                <td>
                  <div className="vacancy-money-stack">
                    <b>월 {formatManWon(item.monthlyRent)}</b>
                    <span>보 {formatLargeManWon(item.deposit)} · 관 {formatManWon(item.maintenanceFee)}</span>
                  </div>
                </td>
                <td>{formatArea(item.locationArea)}</td>
                <td>{formatCount((item.restaurantCount500m ?? 0) + (item.cafeCount500m ?? 0))}개</td>
                <td>{formatPeople(item.floatingPopulationQuarterlyAverage)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

