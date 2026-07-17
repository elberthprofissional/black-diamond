import { describe, it, expect } from 'vitest';
import {
  BLOCKED_NAME,
  BLOCKED_PHONE,
  INACTIVE_DAYS,
  NULL_UUID,
  MENSALISTA_EXCLUDED_SERVICES,
  MASK_SENSITIVE_DATA,
} from './constants';

describe('constants', () => {
  it('exports BLOCKED_NAME with correct value', () => {
    expect(BLOCKED_NAME).toBe('BLOQUEADO');
  });

  it('exports BLOCKED_PHONE with correct value', () => {
    expect(BLOCKED_PHONE).toBe('00000000000');
  });

  it('exports NULL_UUID', () => {
    expect(NULL_UUID).toBe('00000000-0000-0000-0000-000000000000');
  });

  it('exports INACTIVE_DAYS as a number', () => {
    expect(INACTIVE_DAYS).toBeGreaterThan(0);
  });

  it('exports MENSALISTA_EXCLUDED_SERVICES as an array', () => {
    expect(Array.isArray(MENSALISTA_EXCLUDED_SERVICES)).toBe(true);
    expect(MENSALISTA_EXCLUDED_SERVICES.length).toBeGreaterThan(0);
  });

  it('exports MASK_SENSITIVE_DATA as boolean', () => {
    expect(typeof MASK_SENSITIVE_DATA).toBe('boolean');
  });
});
