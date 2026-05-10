import { api, type Vacancy } from '../../api';

export async function fetchVacanciesByIds(ids: string[]): Promise<Vacancy[]> {
  const uniqueIds = Array.from(new Set(ids));
  const settled = await Promise.allSettled(uniqueIds.map(id => api.vacancies.get(id)));
  return settled
    .filter((result): result is PromiseFulfilledResult<Vacancy> => result.status === 'fulfilled')
    .map(result => result.value);
}

