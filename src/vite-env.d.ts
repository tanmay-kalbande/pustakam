/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_USE_PROXY?: string;
  readonly VITE_PROXY_URL?: string;
  readonly VITE_LANDING_CHAT_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
