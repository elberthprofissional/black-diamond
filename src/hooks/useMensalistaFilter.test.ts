import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMensalistaFilter } from './useMensalistaFilter';
import type { Service, MensalistaPlan } from '../types';

const allServices: Service[] = [
  { id: '1', name: 'Corte de Cabelo', price: 50, duration: 30 },
  { id: '2', name: 'Barba', price: 30, duration: 20 },
  { id: '3', name: 'Degradê', price: 60, duration: 40 },
];

describe('useMensalistaFilter', () => {
  describe('filteredServices', () => {
    it('returns all services when not mensalista', () => {
      const { result } = renderHook(() =>
        useMensalistaFilter({
          isMensalista: false,
          currentPlan: null,
          allServices,
          selectedServices: [],
          onServicesChange: vi.fn(),
        })
      );

      expect(result.current.filteredServices).toEqual(allServices);
    });

    it('excludes services by name when no plan', () => {
      const { result } = renderHook(() =>
        useMensalistaFilter({
          isMensalista: true,
          currentPlan: null,
          allServices,
          selectedServices: [],
          onServicesChange: vi.fn(),
        })
      );

      expect(result.current.filteredServices).toHaveLength(2);
      expect(
        result.current.filteredServices.find((s) => s.name === 'Corte de Cabelo')
      ).toBeUndefined();
    });

    it('excludes services by plan included_service_ids', () => {
      const plan: MensalistaPlan = {
        id: '1',
        name: 'Basico',
        price: 100,
        included_service_ids: ['1', '2'],
        allowed_days: [1, 2, 3, 4],
        is_active: true,
        is_default: false,
        sort_order: 1,
        created_at: '',
      };

      const { result } = renderHook(() =>
        useMensalistaFilter({
          isMensalista: true,
          currentPlan: plan,
          allServices,
          selectedServices: [],
          onServicesChange: vi.fn(),
        })
      );

      expect(result.current.filteredServices).toHaveLength(1);
      expect(result.current.filteredServices[0].name).toBe('Degradê');
    });
  });

  describe('filterDaysForMensalista', () => {
    it('returns all days when not mensalista', () => {
      const { result } = renderHook(() =>
        useMensalistaFilter({
          isMensalista: false,
          currentPlan: null,
          allServices,
          selectedServices: [],
          onServicesChange: vi.fn(),
        })
      );

      const days = [
        { fullDate: '2026-07-13' }, // Monday
        { fullDate: '2026-07-18' }, // Saturday
        { fullDate: '2026-07-19' }, // Sunday
      ];

      const filtered = result.current.filterDaysForMensalista(days);
      expect(filtered).toHaveLength(3);
    });

    it('filters to Mon-Thu when mensalista', () => {
      const { result } = renderHook(() =>
        useMensalistaFilter({
          isMensalista: true,
          currentPlan: null,
          allServices,
          selectedServices: [],
          onServicesChange: vi.fn(),
        })
      );

      // July 2026: Mon=13, Tue=14, Wed=15, Thu=16, Fri=17, Sat=18, Sun=19
      const days = [
        { fullDate: '2026-07-13' }, // Monday
        { fullDate: '2026-07-14' }, // Tuesday
        { fullDate: '2026-07-15' }, // Wednesday
        { fullDate: '2026-07-16' }, // Thursday
        { fullDate: '2026-07-17' }, // Friday
        { fullDate: '2026-07-18' }, // Saturday
        { fullDate: '2026-07-19' }, // Sunday
      ];

      const filtered = result.current.filterDaysForMensalista(days);
      expect(filtered).toHaveLength(4);
      expect(filtered.map((d) => d.fullDate)).toEqual([
        '2026-07-13',
        '2026-07-14',
        '2026-07-15',
        '2026-07-16',
      ]);
    });
  });
});
