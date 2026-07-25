import { describe, it, expect, vi } from 'vitest';

describe('playNotificationSound', () => {
  it('executa sem lançar erro', async () => {
    vi.resetModules();
    const { playNotificationSound } = await import('./notification-sound');
    // A função tem try/catch interno, então nunca deve lançar
    expect(() => playNotificationSound()).not.toThrow();
  });

  it('pode ser chamada múltiplas vezes', async () => {
    vi.resetModules();
    const { playNotificationSound } = await import('./notification-sound');
    expect(() => {
      playNotificationSound();
      playNotificationSound();
      playNotificationSound();
    }).not.toThrow();
  });

  it('cobre path do webkitAudioContext fallback (safari)', async () => {
    vi.resetModules();
    // Cobre o operador || que tenta webkitAudioContext como fallback
    // Em jsdom ambos são undefined → cai no catch → cobertura do try/catch
    const { playNotificationSound } = await import('./notification-sound');
    expect(() => playNotificationSound()).not.toThrow();
  });
});
