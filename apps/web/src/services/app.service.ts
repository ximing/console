import { Service } from '@rabjs/react';
import { appApi } from '../api/app';
import { type AppDto, type CreateAppDto, type UpdateAppDto } from '@x-console/dto';
import { toast } from './toast.service';

/** App Service - Manages app state and operations */
export class AppService extends Service {
  apps: AppDto[] = [];
  currentApp: AppDto | null = null;
  loading = false;

  async loadApps(): Promise<void> {
    this.loading = true;
    try {
      const result = await appApi.getApps();
      this.apps = result.apps;
    } finally {
      this.loading = false;
    }
  }

  async createApp(data: CreateAppDto): Promise<AppDto | null> {
    try {
      const app = await appApi.createApp(data);
      this.apps = [app, ...this.apps];
      return app;
    } catch (err) {
      console.error('Create app error:', err);
      toast.error('Failed to create app');
      return null;
    }
  }

  async updateApp(id: string, data: UpdateAppDto): Promise<AppDto | null> {
    try {
      const app = await appApi.updateApp(id, data);
      const idx = this.apps.findIndex((a) => a.id === id);
      if (idx !== -1) {
        this.apps = [...this.apps.slice(0, idx), app, ...this.apps.slice(idx + 1)];
      }
      if (this.currentApp?.id === id) {
        this.currentApp = app;
      }
      return app;
    } catch (err) {
      console.error('Update app error:', err);
      toast.error('Failed to update app');
      return null;
    }
  }

  async deleteApp(id: string): Promise<boolean> {
    try {
      await appApi.deleteApp(id);
      this.apps = this.apps.filter((a) => a.id !== id);
      if (this.currentApp?.id === id) {
        this.currentApp = null;
      }
      return true;
    } catch (err) {
      console.error('Delete app error:', err);
      toast.error('Failed to delete app');
      return false;
    }
  }
}

export const appService = new AppService();
