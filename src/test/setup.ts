import '@testing-library/jest-dom';
import { cleanup, act } from '@testing-library/react';
import { vi, afterEach } from 'vitest';

// ─── Global cleanup after each test ───
// Suppresses act() warnings from async state updates that resolve after test completion
afterEach(() => {
  cleanup();
  // Flush any pending timers/microtasks to avoid cross-test leakage
  act(() => {});
});

// ─── Global Supabase mock ───
// Provides a baseline mock so individual tests don't have to set up
// supabase.from() / supabase.rpc() from scratch every time.
const createMockQueryBuilder = () => {
  const chain: Record<string, unknown> = {};
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((resolve: (v: unknown) => void) => resolve({ data: [], error: null, count: 0 })),
  };
  return Object.assign(chain, builder);
};

const createMockRpc = () => {
  const rpcResult = { data: null, error: null };
  return {
    ...rpcResult,
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(rpcResult),
    maybeSingle: vi.fn().mockResolvedValue(rpcResult),
    then: vi.fn((resolve: (v: unknown) => void) => {
      resolve(rpcResult);
      return { catch: vi.fn() };
    }),
  };
};

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => createMockQueryBuilder()),
    rpc: vi.fn(() => createMockRpc()),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi
        .fn()
        .mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn().mockResolvedValue({ error: null }),
  },
}));

// ─── Browser API mocks ───

// matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// scrollTo
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

// requestIdleCallback (used in main.tsx)
window.requestIdleCallback =
  window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1) as unknown as number);

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// URL.createObjectURL / revokeObjectURL
if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
}
if (!window.URL.revokeObjectURL) {
  window.URL.revokeObjectURL = vi.fn();
}

// Mock window.open
window.open = vi.fn() as unknown as typeof window.open;

// ─── Suppress known cosmetic warnings in test environment ───
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  // React act() warnings from async state updates resolving after test completion
  if (msg.includes('was not wrapped in act(') || msg.includes('ReactDOMTestUtils.act')) {
    return;
  }
  // Framer Motion props on DOM elements (false positives in jsdom)
  if (
    msg.includes('React does not recognize the') &&
    (msg.includes('whileHover') ||
      msg.includes('whileTap') ||
      msg.includes('layoutId') ||
      msg.includes('animate') ||
      msg.includes('transition'))
  ) {
    return;
  }
  originalConsoleError(...args);
};
