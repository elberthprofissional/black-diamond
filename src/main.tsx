import * as Sentry from '@sentry/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { BarberSettingsProvider } from './contexts/BarberSettingsContext';

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

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.DEV ? 'development' : 'production',
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
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BarberSettingsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </BarberSettingsProvider>
    </HelmetProvider>
  </StrictMode>
);

// Service Worker update notification
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_UPDATED') {
      // Show a subtle notification that a new version is available
      const toast = document.createElement('div');
      toast.className =
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] bg-[#1a1a1a] border border-[#C5A059]/30 rounded-xl px-6 py-3 flex items-center gap-3 shadow-2xl shadow-black/40';

      const dot = document.createElement('span');
      dot.className = 'w-2 h-2 rounded-full bg-[#C5A059] animate-pulse';

      const label = document.createElement('span');
      label.className = 'text-xs font-medium text-zinc-300';
      label.textContent = 'Nova vers\u00e3o dispon\u00edvel';

      const btn = document.createElement('button');
      btn.className =
        'text-[10px] font-bold text-[#C5A059] hover:text-white transition-colors cursor-pointer uppercase tracking-wider';
      btn.textContent = 'Atualizar';
      btn.addEventListener('click', () => window.location.reload());

      toast.append(dot, label, btn);
      document.body.appendChild(toast);

      // Auto-remove after 10 seconds
      setTimeout(() => {
        toast.remove();
      }, 10000);
    }
  });
}
