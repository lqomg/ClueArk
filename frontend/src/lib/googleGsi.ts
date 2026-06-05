const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const LOAD_TIMEOUT_MS = 10_000;

export type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

type GoogleIdApi = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: { type?: string; theme?: string; size?: string; width?: number },
  ) => void;
  prompt: (momentListener?: (notification: { isNotDisplayed: () => boolean }) => void) => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdApi;
      };
    };
  }
}

let loadPromise: Promise<void> | null = null;

function isGsiReady(): boolean {
  return !!window.google?.accounts?.id;
}

/** 按需加载 Google Identity Services（不在首屏拉取） */
export function loadGoogleGsiScript(): Promise<void> {
  if (isGsiReady()) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_URL}"]`);
    if (existing) {
      if (isGsiReady()) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => (isGsiReady() ? resolve() : reject(new Error('gsi_incomplete'))), {
        once: true,
      });
      existing.addEventListener('error', () => reject(new Error('gsi_load_failed')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    const timer = window.setTimeout(() => reject(new Error('gsi_timeout')), LOAD_TIMEOUT_MS);
    script.onload = () => {
      window.clearTimeout(timer);
      if (isGsiReady()) resolve();
      else reject(new Error('gsi_incomplete'));
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('gsi_load_failed'));
    };
    document.head.appendChild(script);
  }).catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

export function getGoogleIdApi(): GoogleIdApi | null {
  return window.google?.accounts?.id ?? null;
}
