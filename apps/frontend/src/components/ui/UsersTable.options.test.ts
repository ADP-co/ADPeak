import { describe, expect, it } from 'vitest';
import type { CatalogIndicator } from '../../api/catalog';
import { dedupeIndicatorAssignmentOptions } from './UsersTable';

function indicator(input: Partial<CatalogIndicator> & Pick<CatalogIndicator, 'code' | 'name'>): CatalogIndicator {
  return {
    id: 1,
    description: input.name,
    dataType: 'number',
    period: '2026',
    active: true,
    primaryResponsibleId: 1,
    responsibleIds: [1],
    responsibleNames: ['Responsable'],
    contributorNames: [],
    activities: ['Actividad'],
    plantelIds: [],
    ...input,
  };
}

describe('user indicator assignment options', () => {
  it('deduplicates backend indicators by normalized code and excludes inactive rows', () => {
    const options = dedupeIndicatorAssignmentOptions([
      indicator({ code: ' 1.1.2.0.3 ', name: 'Abandono escolar' }),
      indicator({ id: 2, code: '1.1.2.0.3', name: 'Duplicado' }),
      indicator({ id: 3, code: '1.0.0.0.2', name: 'Titulación' }),
      indicator({ id: 4, code: '4.1.1.0.1', name: 'Inactivo', active: false }),
    ]);

    expect(options).toEqual([
      { code: '1.0.0.0.2', name: 'Titulación' },
      { code: '1.1.2.0.3', name: 'Abandono escolar' },
    ]);
  });
});
