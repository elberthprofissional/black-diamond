/// <reference types="vite/client" />

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Window {
  deferredPrompt?: BeforeInstallPromptEvent;
  dataLayer?: unknown[][];
}

interface Navigator {
  standalone?: boolean;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_BARBER_WHATSAPP: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
  readonly VITE_GA_ID: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_ADMIN_EMAIL: string;
  readonly VITE_ADMIN_NAME: string;
  readonly VITE_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
