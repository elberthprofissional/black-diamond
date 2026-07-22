/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __COMMIT_SHA__: string;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Window {
  gtag: (...args: unknown[]) => void;
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
  readonly VITE_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface SeasonalTemplate {
  name: string;
  body: string;
}

interface SeasonalSeason {
  key: string;
  predicate: {
    month: number[];
    dayRange: Record<string, number[]>;
  };
  templates: SeasonalTemplate[];
}

interface SeasonalTemplates {
  generic: SeasonalTemplate[];
  seasons: SeasonalSeason[];
}

declare module '*.json' {
  const value: Record<string, unknown>;
  export default value;
}
