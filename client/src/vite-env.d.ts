/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly __API_BASE_URL__: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
