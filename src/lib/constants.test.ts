import { describe, it, expect } from 'vitest';
import { BLOCKED_NAME, BLOCKED_PHONE, INACTIVE_DAYS } from './constants';

describe('constants', () => {
  it('exports BLOCKED_NAME with correct value', () => {
    expect(BLOCKED_NAME).toBe('BLOQUEADO');
  });

  it('exports BLOCKED_PHONE with correct value', () => {
    expect(BLOCKED_PHONE).toBe('00000000000');
  });

  it('exports INACTIVE_DAYS as a number', () => {
    expect(INACTIVE_DAYS).toBeGreaterThan(0);
  });
});
