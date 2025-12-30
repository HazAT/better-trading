// Vendor
import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

// Types
import SyncSettings from 'better-trading/services/sync-settings';

export default class PageAboutSyncSettings extends Component {
  @service('sync-settings')
  syncSettings: SyncSettings;

  @tracked isToggling = false;

  get syncEnabled() {
    return this.syncSettings.syncEnabled;
  }

  get quotaInfo() {
    return this.syncSettings.quotaInfo;
  }

  get formattedQuotaUsage() {
    return this.syncSettings.formattedQuotaUsage;
  }

  get showQuotaWarning() {
    return this.syncSettings.showQuotaWarning;
  }

  get lastError() {
    return this.syncSettings.lastError;
  }

  @action
  async onToggleSync(enabled: boolean) {
    this.isToggling = true;

    try {
      await this.syncSettings.toggleSync(enabled);
    } finally {
      this.isToggling = false;
    }
  }
}
