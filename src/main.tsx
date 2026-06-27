import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              const toast = document.createElement('div');
              toast.id = 'sw-update-toast';
              toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;background:#111;color:#C5A059;padding:12px 24px;border-radius:12px;border:1px solid rgba(197,160,89,0.2);font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;box-shadow:0 20px 50px rgba(0,0,0,0.8);';
              toast.textContent = 'Atualização disponível — Toque para recarregar';
              toast.onclick = () => window.location.reload();
              document.body.appendChild(toast);
              setTimeout(() => toast.remove(), 10000);
            }
          });
        }
      });
    }).catch((err) => {
      console.warn('Service Worker registration failed:', err);
    });
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e as BeforeInstallPromptEvent;
});
