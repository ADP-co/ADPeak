import { describe, expect, it } from 'vitest';
import {
  aggregateIndicatorStatus,
  countIndicatorStatuses,
  summarizeIndicatorStatusCounts,
} from './indicatorStatus';

describe('indicator aggregate status', () => {
  it('keeps an approved capture visible when other scopes remain pending', () => {
    const counts = countIndicatorStatuses(['Aprobado', ...Array(35).fill('Pendiente')]);

    expect(aggregateIndicatorStatus(counts)).toBe('Avance parcial');
    expect(summarizeIndicatorStatusCounts(counts)).toBe('1 aprobado · 35 pendientes');
  });

  it('marks an indicator approved only when all its records are approved', () => {
    const counts = countIndicatorStatuses(['Aprobado', 'cerrado']);

    expect(aggregateIndicatorStatus(counts)).toBe('Aprobado');
  });

  it('prioritizes actionable review and correction states', () => {
    expect(aggregateIndicatorStatus(countIndicatorStatuses(['Aprobado', 'En revisión']))).toBe('En revisión');
    expect(aggregateIndicatorStatus(countIndicatorStatuses(['En revisión', 'Observado']))).toBe('Corregir');
  });

  it('uses pending for an empty or entirely pending scope', () => {
    expect(aggregateIndicatorStatus(countIndicatorStatuses([]))).toBe('Pendiente');
    expect(aggregateIndicatorStatus(countIndicatorStatuses(['Borrador', 'Pendiente']))).toBe('Pendiente');
  });
});
