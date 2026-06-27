/// <reference types="vite/client" />

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Window {
  deferredPrompt?: BeforeInstallPromptEvent;
}

interface Navigator {
  standalone?: boolean;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_BARBER_WHATSAPP: string;
  readonly VITE_VAPID_PUBLIC_KEY: string;
  readonly VITE_ADMIN_EMAIL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
