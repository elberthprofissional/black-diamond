import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registra o Service Worker para habilitar o PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registrado com sucesso:', reg.scope);
      })
      .catch((err) => {
        console.error('Falha ao registrar o Service Worker:', err);
      });
  });
}

// Captura o evento de instalação do PWA globalmente para uso no perfil do Admin
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e as BeforeInstallPromptEvent;
});


