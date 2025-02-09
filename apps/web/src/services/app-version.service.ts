import { Service } from '@rabjs/react';
import { appApi } from '../api/app';
import { AppVersionDto, CreateVersionDto, UpdateVersionDto } from '@x-console/dto';
import { toast } from './toast.service';

export class AppVersionService extends Service {
  versions: AppVersionDto[] = [];
  currentVersion: AppVersionDto | null = null;
  loading = false;

  async loadVersions(appId: string): Promise<void> {
    this.loading = true;
    try {
      const result = await appApi.getVersions(appId);
      this.versions = result.versions;
    } finally {
      this.loading = false;
    }
  }

  async createVersion(appId: string, data: CreateVersionDto): Promise<AppVersionDto | null> {
    try {
      const version = await appApi.createVersion(appId, data);
      this.versions = [version, ...this.versions];
      return version;
    } catch (err) {
      toast.error('Failed to create version');
      return null;
    }
  }

  async updateVersion(
    appId: string,
    versionId: string,
    data: UpdateVersionDto
  ): Promise<AppVersionDto | null> {
    try {
      const version = await appApi.updateVersion(appId, versionId, data);
      const idx = this.versions.findIndex((v) => v.id === versionId);
      if (idx !== -1) {
        this.versions = [...this.versions.slice(0, idx), version, ...this.versions.slice(idx + 1)];
      }
      if (this.currentVersion?.id === versionId) {
        this.currentVersion = version;
      }
      return version;
    } catch (err) {
      toast.error('Failed to update version');
      return null;
    }
  }

  async deleteVersion(appId: string, versionId: string): Promise<boolean> {
    try {
      await appApi.deleteVersion(appId, versionId);
      this.versions = this.versions.filter((v) => v.id !== versionId);
      if (this.currentVersion?.id === versionId) {
        this.currentVersion = null;
      }
      return true;
    } catch (err) {
      toast.error('Failed to delete version');
      return false;
    }
  }
}

export const appVersionService = new AppVersionService();
