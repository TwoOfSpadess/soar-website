/// <reference types="vite/client" />

/* Both are absent in local dev and in any build that has no API to talk to,
   which is exactly when the chat falls back to its scripted answers. */
interface ImportMetaEnv {
  /** Origin of soar-api, e.g. https://api.soar-crm.com. */
  readonly VITE_SOAR_API?: string;
  /** Public embed key (sik_...). Public by design: it ships in the bundle, it
      maps to one org, and the server caps what it can spend. */
  readonly VITE_SOAR_INGEST_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
