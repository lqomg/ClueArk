export type AppEnv = 'development' | 'demo' | 'production';

export type EnvironmentNotice = {
  env: Exclude<AppEnv, 'production'>;
  title: string;
  detail: string;
};

function parseAppEnv(raw: string | undefined): AppEnv | null {
  if (raw === 'development' || raw === 'demo' || raw === 'production') return raw;
  return null;
}

/** 部署环境：显式 `VITE_APP_ENV`，否则 dev server 视为 development，构建产物默认为 production */
export function getAppEnv(): AppEnv {
  const fromEnv = parseAppEnv(import.meta.env.VITE_APP_ENV);
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return 'development';
  return 'production';
}

export function getEnvironmentNotice(): EnvironmentNotice | null {
  const env = getAppEnv();
  if (env === 'development') {
    return {
      env: 'development',
      title: '开发环境',
      detail: '功能与数据不稳定，可能随时重置，请勿填写敏感信息或用于正式业务。',
    };
  }
  if (env === 'demo') {
    return {
      env: 'demo',
      title: '演示环境',
      detail: '数据将定期清理，请勿乱改共享数据或上传敏感信息。',
    };
  }
  return null;
}

export function environmentDocumentTitleSuffix(): string {
  const env = getAppEnv();
  if (env === 'development') return ' [DEV]';
  if (env === 'demo') return ' [Demo]';
  return '';
}
