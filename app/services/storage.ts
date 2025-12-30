// Vendor
import Service from '@ember/service';
import {tracked} from '@glimmer/tracking';
import {extensionApi} from 'better-trading/utilities/extension-api';
import window from 'ember-window-mock';

// Constants
const PAST_LEAGUES = ['blight', 'metamorph', 'delirium'];
const SYNC_ENABLED_KEY = 'bt-sync-enabled';
const SYNCABLE_KEY_PATTERNS = ['bookmark-folders', 'bookmark-trades--', 'trade-history'];
const SYNC_QUOTA_WARNING_THRESHOLD = 0.8;
const SYNC_ITEM_WARNING_THRESHOLD = 0.9;

type StorageBackend = 'local' | 'sync';

interface StoragePayload {
  value: any;
  expiresAt: string | null;
}

export interface SyncQuotaInfo {
  bytesUsed: number;
  totalQuota: number;
  percentUsed: number;
  itemCount: number;
  maxItems: number;
  isNearQuota: boolean;
  isNearItemLimit: boolean;
}

export interface SyncResult {
  success: boolean;
  error?: string;
}

export default class Storage extends Service {
  @tracked syncEnabled: boolean = false;
  @tracked syncQuotaInfo: SyncQuotaInfo | null = null;

  async initialize() {
    await this.cleanupPastLeagues();
    this.syncEnabled = this.getLocalValue(SYNC_ENABLED_KEY) === 'true';
    if (this.syncEnabled) {
      await this.updateSyncQuotaInfo();
    }
  }

  setLocalValue(key: string, value: string, league: string | null = null) {
    window.localStorage.setItem(`bt-${this.formatKey(key, league)}`, value);
  }

  getLocalValue(key: string, league: string | null = null) {
    return window.localStorage.getItem(`bt-${this.formatKey(key, league)}`);
  }

  deleteLocalValue(key: string, league: string | null = null) {
    window.localStorage.removeItem(`bt-${this.formatKey(key, league)}`);
  }

  async setValue(key: string, value: any, league: string | null = null) {
    return this.write(this.formatKey(key, league), {
      expiresAt: null,
      value,
    });
  }

  async setEphemeralValue(key: string, value: any, expirationDate: Date, league: string | null = null) {
    return this.write(this.formatKey(key, league), {
      expiresAt: expirationDate.toUTCString(),
      value,
    });
  }

  async getValue<T>(key: string, league: string | null = null): Promise<T | null> {
    const payload = await this.read(this.formatKey(key, league));
    if (!payload) return null;

    const {expiresAt, value} = payload;

    if (!expiresAt) return value;

    const expirationTimestamp = new Date(expiresAt).getTime();
    const currentTimestamp = new Date().getTime();

    if (currentTimestamp > expirationTimestamp) return null;

    return value;
  }

  async deleteValue(key: string, league: string | null = null) {
    return this.remove(this.formatKey(key, league));
  }

  private formatKey(key: string, league: string | null) {
    let formattedKey = key;
    if (league) formattedKey += `--${league}`;

    return formattedKey.toLowerCase();
  }

  private async cleanupPastLeagues() {
    const pastLeaguesRegex = new RegExp(`--(${PAST_LEAGUES.join('|')})$`);
    const storageKeys = await this.fetchAllKeys();

    await this.remove(storageKeys.filter((storageKey: string) => pastLeaguesRegex.test(storageKey)));
  }

  private async fetchAllKeys(): Promise<string[]> {
    return new Promise((resolve, _reject) => {
      extensionApi().storage.local.get(null, (result) => {
        resolve(Object.keys(result));
      });
    });
  }

  private getBackendForKey(key: string): StorageBackend {
    if (!this.syncEnabled) return 'local';
    const isSyncable = SYNCABLE_KEY_PATTERNS.some((pattern) => key.startsWith(pattern));
    return isSyncable ? 'sync' : 'local';
  }

  private getStorageApi(backend: StorageBackend) {
    return backend === 'sync' ? extensionApi().storage.sync : extensionApi().storage.local;
  }

  private async read(key: string): Promise<StoragePayload | null> {
    const backend = this.getBackendForKey(key);
    const storageApi = this.getStorageApi(backend);

    return new Promise((resolve, _reject) => {
      storageApi.get([key], (result) => {
        if (result[key]) {
          resolve(result[key]);
        } else {
          resolve(null);
        }
      });
    });
  }

  private async write(key: string, value: StoragePayload): Promise<void> {
    const backend = this.getBackendForKey(key);
    const storageApi = this.getStorageApi(backend);

    return new Promise((resolve, reject) => {
      storageApi.set({[key]: value}, () => {
        const lastError = extensionApi().runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  private async remove(keys: string | string[]): Promise<void> {
    const keysArray = Array.isArray(keys) ? keys : [keys];

    if (keysArray.length === 0) return;

    const localKeys = keysArray.filter((k) => this.getBackendForKey(k) === 'local');
    const syncKeys = keysArray.filter((k) => this.getBackendForKey(k) === 'sync');

    const promises: Promise<void>[] = [];

    if (localKeys.length > 0) {
      promises.push(
        new Promise((resolve) => {
          extensionApi().storage.local.remove(localKeys, resolve);
        })
      );
    }

    if (syncKeys.length > 0) {
      promises.push(
        new Promise((resolve) => {
          extensionApi().storage.sync.remove(syncKeys, resolve);
        })
      );
    }

    await Promise.all(promises);
  }

  private async readFromBackend(key: string, backend: StorageBackend): Promise<StoragePayload | null> {
    const storageApi = this.getStorageApi(backend);
    return new Promise((resolve) => {
      storageApi.get([key], (result) => {
        resolve(result[key] || null);
      });
    });
  }

  private async writeToBackend(key: string, value: StoragePayload, backend: StorageBackend): Promise<void> {
    const storageApi = this.getStorageApi(backend);
    return new Promise((resolve, reject) => {
      storageApi.set({[key]: value}, () => {
        const lastError = extensionApi().runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  private async fetchAllKeysFromBackend(backend: StorageBackend): Promise<string[]> {
    const storageApi = this.getStorageApi(backend);
    return new Promise((resolve) => {
      storageApi.get(null, (result) => {
        resolve(Object.keys(result));
      });
    });
  }

  async setSyncEnabled(enabled: boolean): Promise<SyncResult> {
    if (enabled === this.syncEnabled) {
      return {success: true};
    }

    if (enabled) {
      const migrationResult = await this.migrateLocalToSync();
      if (!migrationResult.success) {
        return migrationResult;
      }
    } else {
      await this.migrateSyncToLocal();
    }

    this.setLocalValue(SYNC_ENABLED_KEY, enabled.toString());
    this.syncEnabled = enabled;

    if (enabled) {
      await this.updateSyncQuotaInfo();
    } else {
      this.syncQuotaInfo = null;
    }

    return {success: true};
  }

  private async migrateLocalToSync(): Promise<SyncResult> {
    const allLocalKeys = await this.fetchAllKeys();
    const syncableKeys = allLocalKeys.filter((key) =>
      SYNCABLE_KEY_PATTERNS.some((pattern) => key.startsWith(pattern))
    );

    const dataToMigrate: Record<string, StoragePayload> = {};
    for (const key of syncableKeys) {
      const value = await this.readFromBackend(key, 'local');
      if (value) {
        dataToMigrate[key] = value;
      }
    }

    const dataSize = new Blob([JSON.stringify(dataToMigrate)]).size;
    const syncApi = extensionApi().storage.sync;

    if (dataSize > syncApi.QUOTA_BYTES) {
      return {
        success: false,
        error: `Data size (${this.formatBytes(dataSize)}) exceeds sync quota (${this.formatBytes(syncApi.QUOTA_BYTES)})`,
      };
    }

    for (const [key, value] of Object.entries(dataToMigrate)) {
      const itemSize = new Blob([JSON.stringify({[key]: value})]).size;
      if (itemSize > syncApi.QUOTA_BYTES_PER_ITEM) {
        return {
          success: false,
          error: `Item "${key}" (${this.formatBytes(itemSize)}) exceeds per-item limit (${this.formatBytes(syncApi.QUOTA_BYTES_PER_ITEM)})`,
        };
      }
    }

    try {
      for (const [key, value] of Object.entries(dataToMigrate)) {
        await this.writeToBackend(key, value, 'sync');
      }
    } catch (error) {
      return {success: false, error: `Migration failed: ${(error as Error).message}`};
    }

    return {success: true};
  }

  private async migrateSyncToLocal(): Promise<void> {
    const syncKeys = await this.fetchAllKeysFromBackend('sync');
    const syncableKeys = syncKeys.filter((key) =>
      SYNCABLE_KEY_PATTERNS.some((pattern) => key.startsWith(pattern))
    );

    for (const key of syncableKeys) {
      const value = await this.readFromBackend(key, 'sync');
      if (value) {
        await this.writeToBackend(key, value, 'local');
      }
    }
  }

  async updateSyncQuotaInfo(): Promise<SyncQuotaInfo> {
    const syncApi = extensionApi().storage.sync;

    const bytesUsed = await new Promise<number>((resolve) => {
      syncApi.getBytesInUse(null, resolve);
    });

    const allKeys = await this.fetchAllKeysFromBackend('sync');
    const itemCount = allKeys.length;

    const quotaInfo: SyncQuotaInfo = {
      bytesUsed,
      totalQuota: syncApi.QUOTA_BYTES,
      percentUsed: (bytesUsed / syncApi.QUOTA_BYTES) * 100,
      itemCount,
      maxItems: syncApi.MAX_ITEMS,
      isNearQuota: bytesUsed >= syncApi.QUOTA_BYTES * SYNC_QUOTA_WARNING_THRESHOLD,
      isNearItemLimit: itemCount >= syncApi.MAX_ITEMS * SYNC_ITEM_WARNING_THRESHOLD,
    };

    this.syncQuotaInfo = quotaInfo;
    return quotaInfo;
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  }

  getFormattedQuotaUsage(): string {
    if (!this.syncQuotaInfo) return '';
    const {bytesUsed, totalQuota, percentUsed} = this.syncQuotaInfo;
    return `${this.formatBytes(bytesUsed)} / ${this.formatBytes(totalQuota)} (${percentUsed.toFixed(1)}%)`;
  }
}

declare module '@ember/service' {
  interface Registry {
    storage: Storage;
  }
}
