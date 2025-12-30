// Config
import config from 'better-trading/config/environment';

interface StorageArea {
  get(keys: string[] | null, callback: (result: any) => void): void;
  set(data: object, callback: () => void): void;
  remove(keys: string | string[], callback: () => void): void;
  getBytesInUse(keys: string[] | null, callback: (bytesInUse: number) => void): void;
}

interface SyncStorageArea extends StorageArea {
  QUOTA_BYTES: number;
  QUOTA_BYTES_PER_ITEM: number;
  MAX_ITEMS: number;
}

interface ExtensionApi {
  runtime: {
    getURL(path: string): string;
    sendMessage(query: object, callback: (payload: object | null) => void): void;
    lastError?: {message: string} | null;
  };

  storage: {
    local: StorageArea;
    sync: SyncStorageArea;
  };
}

export const extensionApi = (): ExtensionApi => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  // eslint-disable-next-line no-undef
  return config.APP.browser === 'chrome' ? chrome : browser;
};
