import { describe, expect, it, vi } from 'vitest';
import {
  deactivateIndicator,
  deactivateUser,
  effectivePlantelIdsForIndicator,
  fetchIndicatorTemplate,
  fetchIndicators,
  saveIndicator,
  saveUser,
} from './catalog';

vi.mock('./client', () => ({
  API_REQUESTS_ENABLED: false,
  apiJson: vi.fn(async () => {
    throw new Error('api_unavailable');
  }),
}));

describe('catalog API safety', () => {
  it('uses the effective plantel scope resolved by the backend', () => {
    expect(effectivePlantelIdsForIndicator({
      code: '1.0.0.0.2',
      plantelIds: [],
      effectivePlantelIds: [1, 2, 3],
      operationalScope: 'specific_planteles',
    })).toEqual([1, 2, 3]);
  });

  it('does not create local fake catalog data when the API is unavailable', async () => {
    await expect(saveIndicator({ name: 'Indicador local falso' }))
      .rejects.toThrow('El sistema no está conectado. No se guardaron cambios locales.');
    await expect(deactivateIndicator(1))
      .rejects.toThrow('El sistema no está conectado. No se guardaron cambios locales.');
    await expect(saveUser({ name: 'Responsable local', role: 'responsable' }))
      .rejects.toThrow('El sistema no está conectado. No se guardaron cambios locales.');
    await expect(deactivateUser('responsable-local'))
      .rejects.toThrow('El sistema no está conectado. No se guardaron cambios locales.');
  });

  it('keeps official numeric fallback columns validated instead of free text', async () => {
    const fallbackIndicators = await fetchIndicators();
    const ptcIndicator = fallbackIndicators.find((indicator) => indicator.code === '1.1.2.5.3');
    const abandonoIndicator = fallbackIndicators.find((indicator) => indicator.code === '1.1.2.0.3');

    expect(ptcIndicator).toBeDefined();
    expect(abandonoIndicator).toBeDefined();

    const ptcTemplate = await fetchIndicatorTemplate(ptcIndicator!.code);
    const abandonoTemplate = await fetchIndicatorTemplate(abandonoIndicator!.code);

    expect(ptcTemplate.columns.find((column) => column.key === 'ptc')).toMatchObject({
      type: 'number',
    });
    expect(abandonoTemplate.columns.find((column) => column.key === 'matr')).toMatchObject({
      type: 'number',
    });
    expect(abandonoTemplate.columns.find((column) => column.key === 'tasa_de_reprobacion')).toMatchObject({
      type: 'number',
    });
  });
});
