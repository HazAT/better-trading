// Vendor
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

// Types
import Storage from 'better-trading/services/storage';

describe('Unit | Services | Storage', () => {
  setupTest();

  let service: Storage;

  beforeEach(function () {
    service = this.owner.lookup('service:storage');
  });

  describe('getBackendForKey', () => {
    it('should return local when sync is disabled', () => {
      service.syncEnabled = false;

      // Access private method via any cast
      const backend = (service as any).getBackendForKey('bookmark-folders');
      expect(backend).to.equal('local');
    });

    it('should return sync for bookmark-folders when sync is enabled', () => {
      service.syncEnabled = true;

      const backend = (service as any).getBackendForKey('bookmark-folders');
      expect(backend).to.equal('sync');
    });

    it('should return sync for bookmark-trades keys when sync is enabled', () => {
      service.syncEnabled = true;

      const backend = (service as any).getBackendForKey('bookmark-trades--some-folder-id');
      expect(backend).to.equal('sync');
    });

    it('should return sync for trade-history when sync is enabled', () => {
      service.syncEnabled = true;

      const backend = (service as any).getBackendForKey('trade-history');
      expect(backend).to.equal('sync');
    });

    it('should return local for non-syncable keys even when sync is enabled', () => {
      service.syncEnabled = true;

      const backend = (service as any).getBackendForKey('some-other-key');
      expect(backend).to.equal('local');
    });

    it('should return local for cache keys when sync is enabled', () => {
      service.syncEnabled = true;

      const backend = (service as any).getBackendForKey('poe-ninja-chaos-ratios-cache');
      expect(backend).to.equal('local');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect((service as any).formatBytes(500)).to.equal('500 B');
      expect((service as any).formatBytes(1024)).to.equal('1.0 KB');
      expect((service as any).formatBytes(2048)).to.equal('2.0 KB');
      expect((service as any).formatBytes(102400)).to.equal('100.0 KB');
    });
  });

  describe('getFormattedQuotaUsage', () => {
    it('should return empty string when syncQuotaInfo is null', () => {
      service.syncQuotaInfo = null;

      expect(service.getFormattedQuotaUsage()).to.equal('');
    });

    it('should return formatted quota usage when syncQuotaInfo is set', () => {
      service.syncQuotaInfo = {
        bytesUsed: 51200,
        totalQuota: 102400,
        percentUsed: 50,
        itemCount: 10,
        maxItems: 512,
        isNearQuota: false,
        isNearItemLimit: false,
      };

      expect(service.getFormattedQuotaUsage()).to.equal('50.0 KB / 100.0 KB (50.0%)');
    });
  });

  describe('setSyncEnabled', () => {
    let localStorageStub: sinon.SinonStub;

    beforeEach(() => {
      localStorageStub = sinon.stub(service, 'setLocalValue');
    });

    afterEach(() => {
      localStorageStub.restore();
    });

    it('should return success when already in the requested state', async () => {
      service.syncEnabled = true;

      const result = await service.setSyncEnabled(true);

      expect(result.success).to.be.true;
      expect(localStorageStub.called).to.be.false;
    });
  });
});
