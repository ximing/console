import { Service } from '@rabjs/react';
import { minimaxApi } from '../api/minimax';
import type { MiniMaxModelRemain } from '@x-console/dto';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export class MiniMaxTokenService extends Service {
  modelRemains: MiniMaxModelRemain[] = [];
  loading = false;
  refreshing = false;
  lastRefreshTime: Date | null = null;
  nextRefreshTime: Date | null = null;
  error: string | null = null;

  private intervalId: ReturnType<typeof setInterval> | null = null;

  startAutoRefresh(): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.refreshSilent();
    }, REFRESH_INTERVAL);

    // Set next refresh time
    this.updateNextRefreshTime();
  }

  stopAutoRefresh(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private updateNextRefreshTime(): void {
    this.nextRefreshTime = new Date(Date.now() + REFRESH_INTERVAL);
  }

  async refresh(): Promise<void> {
    if (this.refreshing) return;

    this.refreshing = true;
    this.error = null;

    try {
      const result = await minimaxApi.getTokenRemains();
      this.modelRemains = result.modelRemains;
      this.lastRefreshTime = new Date();
      this.updateNextRefreshTime();
    } catch (err) {
      console.error('Failed to fetch MiniMax token remains:', err);
      this.error = err instanceof Error ? err.message : 'Failed to fetch';
    } finally {
      this.refreshing = false;
    }
  }

  async refreshSilent(): Promise<void> {
    try {
      const result = await minimaxApi.getTokenRemains();
      this.modelRemains = result.modelRemains;
      this.lastRefreshTime = new Date();
      this.updateNextRefreshTime();
      this.error = null;
    } catch (err) {
      console.error('Failed to fetch MiniMax token remains:', err);
      this.error = err instanceof Error ? err.message : 'Failed to fetch';
    }
  }

  getMainModelRemain(): MiniMaxModelRemain | undefined {
    return this.modelRemains.find((m) => m.model_name === 'MiniMax-M*');
  }

  getWeeklyUsageCount(modelName: string): number {
    const model = this.modelRemains.find((m) => m.model_name === modelName);
    return model?.current_weekly_usage_count || 0;
  }

  getWeeklyTotalCount(modelName: string): number {
    const model = this.modelRemains.find((m) => m.model_name === modelName);
    return model?.current_weekly_total_count || 0;
  }

  getIntervalUsageCount(modelName: string): number {
    const model = this.modelRemains.find((m) => m.model_name === modelName);
    return model?.current_interval_usage_count || 0;
  }

  getIntervalTotalCount(modelName: string): number {
    const model = this.modelRemains.find((m) => m.model_name === modelName);
    return model?.current_interval_total_count || 0;
  }

  formatRemainsTime(ms: number): string {
    if (ms <= 0) return '0秒';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    }
    if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    }
    return `${seconds}秒`;
  }

  formatNextRefreshTime(): string {
    if (!this.nextRefreshTime) return '--';
    const now = new Date();
    const diff = this.nextRefreshTime.getTime() - now.getTime();
    if (diff <= 0) return '即将刷新';
    return this.formatRemainsTime(diff);
  }
}

export const minimaxTokenService = new MiniMaxTokenService();
