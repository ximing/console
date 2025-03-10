import { Service } from '@rabjs/react';
import { insightApi } from '../../api/insight';
import type { InsightProfileDto, CreateProfileInput, DayunInput } from '../../api/insight';

export class InsightService extends Service {
  profiles: InsightProfileDto[] = [];
  selectedProfileId: string | null = null;
  isLoading = false;
  error: string | null = null;

  get selectedProfile(): InsightProfileDto | null {
    return this.profiles.find((p) => p.id === this.selectedProfileId) ?? null;
  }

  async loadProfiles(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    try {
      this.profiles = await insightApi.getProfiles();
      if (this.profiles.length > 0 && !this.selectedProfileId) {
        this.selectedProfileId = this.profiles[0].id;
      }
    } catch {
      this.error = '加载档案失败';
    } finally {
      this.isLoading = false;
    }
  }

  selectProfile(id: string): void {
    this.selectedProfileId = id;
  }

  async createProfile(data: CreateProfileInput): Promise<InsightProfileDto | null> {
    try {
      const profile = await insightApi.createProfile(data);
      this.profiles = [...this.profiles, profile];
      this.selectedProfileId = profile.id;
      return profile;
    } catch {
      this.error = '创建档案失败';
      return null;
    }
  }

  async updateProfile(id: string, data: Partial<CreateProfileInput>): Promise<boolean> {
    try {
      const updated = await insightApi.updateProfile(id, data);
      this.profiles = this.profiles.map((p) => (p.id === id ? updated : p));
      return true;
    } catch {
      this.error = '更新档案失败';
      return false;
    }
  }

  async deleteProfile(id: string): Promise<boolean> {
    try {
      await insightApi.deleteProfile(id);
      this.profiles = this.profiles.filter((p) => p.id !== id);
      if (this.selectedProfileId === id) {
        this.selectedProfileId = this.profiles[0]?.id ?? null;
      }
      return true;
    } catch {
      this.error = '删除档案失败';
      return false;
    }
  }

  async saveDayun(profileId: string, dayunList: DayunInput[]): Promise<boolean> {
    try {
      const updated = await insightApi.replaceDayun(profileId, dayunList);
      this.profiles = this.profiles.map((p) =>
        p.id === profileId ? { ...p, dayunList: updated } : p
      );
      return true;
    } catch {
      this.error = '保存大运失败';
      return false;
    }
  }
}
