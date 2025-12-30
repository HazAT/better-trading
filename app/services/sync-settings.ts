// Vendor
import Service, {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

// Types
import Storage, {SyncQuotaInfo} from 'better-trading/services/storage';

export default class SyncSettings extends Service {
  @service('storage')
  storage: Storage;

  @tracked isEnabling = false;
  @tracked lastError: string | null = null;

  get syncEnabled(): boolean {
    return this.storage.syncEnabled;
  }

  get quotaInfo(): SyncQuotaInfo | null {
    return this.storage.syncQuotaInfo;
  }

  get formattedQuotaUsage(): string {
    return this.storage.getFormattedQuotaUsage();
  }

  get showQuotaWarning(): boolean {
    const info = this.quotaInfo;
    return info ? info.isNearQuota || info.isNearItemLimit : false;
  }

  async toggleSync(enabled: boolean): Promise<boolean> {
    this.isEnabling = true;
    this.lastError = null;

    try {
      const result = await this.storage.setSyncEnabled(enabled);
      if (!result.success) {
        this.lastError = result.error || 'Unknown error';
        return false;
      }
      return true;
    } finally {
      this.isEnabling = false;
    }
  }

  async refreshQuotaInfo(): Promise<void> {
    if (this.syncEnabled) {
      await this.storage.updateSyncQuotaInfo();
    }
  }
}

declare module '@ember/service' {
  interface Registry {
    'sync-settings': SyncSettings;
  }
}
