import type { KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Vacancy } from '../../../api';
import { useAuth } from '../../../auth/AuthContext';
import { Icon } from '../../../shared/Icon';
import { MAX_COMPARE_VACANCIES } from '../../../features/vacancies/collections';
import {
  formatArea,
  formatCount,
  formatPeople,
  totalCompetition,
  vacancyRentTerms,
  vacancySubtitle,
  vacancyTitle,
} from '../model';

type VacancyTableProps = {
  items: Vacancy[];
  selectedId: string | null;
  shortlistIds?: string[];
  compareIds?: string[];
  onSelect: (id: string) => void;
  onToggleShortlist?: (id: string) => void;
  onToggleCompare?: (id: string) => void;
};

export function VacancyTable({
  items,
  selectedId,
  shortlistIds = [],
  compareIds = [],
  onSelect,
  onToggleShortlist,
  onToggleCompare,
}: VacancyTableProps) {
  const { user } = useAuth();
  // 상세 보기(예상 생존률 포함)는 Pro·Business 전용. Free/비로그인은 막는다.
  const canViewDetail = user?.tier === 'pro' || user?.tier === 'business';
  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') onSelect(id);
  };

  return (
    <div className="vacancy-table-wrap">
      <table className="vacancy-table">
        <thead>
          <tr>
            <th>비교</th>
            <th>공실</th>
            <th>임대 조건</th>
            <th>면적</th>
            <th>경쟁</th>
            <th>유동</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const selected = item.id === selectedId;
            const rentTerms = vacancyRentTerms(item);
            const isShortlisted = shortlistIds.includes(item.id);
            const isCompared = compareIds.includes(item.id);
            const compareDisabled = !isCompared && compareIds.length >= MAX_COMPARE_VACANCIES;
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
                  <button
                    type="button"
                    className={`vacancy-row-check ${isCompared ? 'is-on' : ''}`}
                    disabled={compareDisabled}
                    onClick={event => {
                      event.stopPropagation();
                      onToggleCompare?.(item.id);
                    }}
                    title={compareDisabled ? '비교는 최대 4개까지 가능해요' : '비교 선택'}
                    aria-pressed={isCompared}
                  >
                    <Icon name={isCompared ? 'check' : 'plus'} size={12} />
                  </button>
                </td>
                <td>
                  <div className="vacancy-row-title">{vacancyTitle(item)}</div>
                  <div className="vacancy-row-sub">{vacancySubtitle(item)}</div>
                </td>
                <td>
                  <div className="vacancy-money-stack">
                    <b>{rentTerms.prefix} {rentTerms.primary}</b>
                    <span>{rentTerms.secondary}</span>
                  </div>
                </td>
                <td>{formatArea(item.dedicatedArea ?? item.locationArea)}</td>
                <td>{formatCount(totalCompetition(item))}개</td>
                <td>{formatPeople(item.floatingPopulationQuarterlyAverage)}</td>
                <td>
                  <div className="vacancy-row-actions">
                    <button
                      type="button"
                      className={`vacancy-row-action ${isShortlisted ? 'is-on' : ''}`}
                      onClick={event => {
                        event.stopPropagation();
                        onToggleShortlist?.(item.id);
                      }}
                      title={isShortlisted ? '찜 해제' : '찜하기'}
                    >
                      <Icon name={isShortlisted ? 'bookmark-filled' : 'bookmark'} size={13} />
                    </button>
                    {canViewDetail ? (
                      <Link
                        className="vacancy-row-action"
                        to={`/vacancies/${item.id}`}
                        onClick={event => event.stopPropagation()}
                        title="상세 보기"
                      >
                        <Icon name="eye" size={13} />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="vacancy-row-action"
                        disabled
                        onClick={event => event.stopPropagation()}
                        title="상세 보기는 Pro 플랜부터 이용할 수 있어요"
                      >
                        <Icon name="lock" size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
