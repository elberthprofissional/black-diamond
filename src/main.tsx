import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';
import { BarberSettingsProvider } from './contexts/BarberSettingsContext';

// ─── React Query Client ──────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos antes de considerar dados "stale"
      retry: 2, // Tenta 2 vezes antes de mostrar erro
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0, // Não retenta mutations automaticamente
    },
  },
});

// Load fonts dynamically (CSP-compliant, no inline handlers)
const loadFonts = () => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Anton&family=Roboto:wght@300;400;500;700&family=Montserrat:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,600;1,700;1,900&family=Cinzel:wght@500;700;900&display=swap';
  document.head.appendChild(link);
};
if (document.readyState === 'complete') {
  loadFonts();
} else {
  window.addEventListener('load', loadFonts);
}

// Polyfill requestIdleCallback for Safari < 15.4
window.requestIdleCallback =
  window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1) as unknown as number);

// Defer non-critical initialization to after first paint
window.requestIdleCallback(() => {
  // Google Analytics
  const gaId = import.meta.env.VITE_GA_ID;
  if (gaId) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];

    // Define global gtag function on window
    window.gtag = function (...args: unknown[]) {
      window.dataLayer!.push(args);
    };

    window.gtag('js', new Date());
    window.gtag('config', gaId, { send_page_view: false });
  }

  // Sentry (heavy SDK — only load after first paint)
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    import('@sentry/react')
      .then((Sentry) => {
        Sentry.init({
          dsn,
          environment: import.meta.env.DEV ? 'development' : 'production',
          release: `${__APP_VERSION__}@${__COMMIT_SHA__}`,
          integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
              maskAllText: true,
              blockAllMedia: true,
            }),
          ],
          tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.2,
          replaysSessionSampleRate: 0,
          replaysOnErrorSampleRate: 1.0,
          beforeSend(event) {
            if (import.meta.env.DEV) {
              return null;
            }
            return event;
          },
        });
      })
      .catch(() => {
        // Sentry failed to load — non-critical
      });
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <BarberSettingsProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </BarberSettingsProvider>
      </HelmetProvider>
    </QueryClientProvider>
  </StrictMode>
);
