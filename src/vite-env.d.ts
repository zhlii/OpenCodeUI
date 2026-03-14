/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface AppConfig {
  APP_NAME?: string
  [key: string]: string | undefined
}

interface Window {
  __APP_CONFIG__?: AppConfig
}
