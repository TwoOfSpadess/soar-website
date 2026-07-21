/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Override the SOAR API origin (local or staging). Defaults to production. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
