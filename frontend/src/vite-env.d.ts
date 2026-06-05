/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  /** development | demo | production；未设置时 dev server 为 development，生产构建为 production */
  readonly VITE_APP_ENV?: string;
  /** Google OAuth Web Client ID（登录页「使用 Google 继续」） */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
