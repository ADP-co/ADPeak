import { describe, expect, it, vi } from 'vitest';
import {
  deactivateIndicator,
  deactivateUser,
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
});
