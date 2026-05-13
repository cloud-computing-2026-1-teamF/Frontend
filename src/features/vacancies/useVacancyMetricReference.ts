import { useEffect, useState } from 'react';
import { api, type VacancyMetricReference } from '../../api';
import { USE_MOCK } from '../../api/client';

type MetricReferenceState = {
  data: VacancyMetricReference | null;
  loading: boolean;
};

const cache = new Map<string, VacancyMetricReference>();

export function useVacancyMetricReference(
  categoryId?: string | null,
  vacancyId?: string | null,
): MetricReferenceState {
  const [state, setState] = useState<MetricReferenceState>({ data: null, loading: false });

  useEffect(() => {
    const normalizedCategoryId = categoryId?.trim();
    const normalizedVacancyId = vacancyId?.trim();
    if (USE_MOCK || !normalizedCategoryId) {
      setState({ data: null, loading: false });
      return;
    }

    const key = `${normalizedCategoryId}:${normalizedVacancyId ?? ''}`;
    const cached = cache.get(key);
    if (cached) {
      setState({ data: cached, loading: false });
      return;
    }

    let cancelled = false;
    setState({ data: null, loading: true });
    api.vacancies.metricReference({
      categoryId: normalizedCategoryId,
      vacancyId: normalizedVacancyId,
    })
      .then(data => {
        cache.set(key, data);
        if (!cancelled) setState({ data, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, [categoryId, vacancyId]);

  return state;
}
