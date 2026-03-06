import { Service, observable } from '@rabjs/react';
import { apiTokenApi } from '../api/api-token';
import type { ApiTokenDto, ApiTokenListDto, CreateApiTokenDto } from '@aimo-console/dto';

@Service()
export class ApiTokenService {
  @observable
  tokens: ApiTokenDto[] = [];

  @observable
  isLoading = false;

  @observable
  error: string | null = null;

  async fetchTokens(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    try {
      const data: ApiTokenListDto = await apiTokenApi.getTokens();
      this.tokens.value = data.tokens;
    } catch (err) {
      this.error.value = err instanceof Error ? err.message : '获取Token列表失败';
    } finally {
      this.isLoading.value = false;
    }
  }

  async createToken(data: CreateApiTokenDto): Promise<ApiTokenDto> {
    this.isLoading.value = true;
    this.error.value = null;
    try {
      const token = await apiTokenApi.createToken(data);
      // Add to local list
      this.tokens.value = [token, ...this.tokens.value];
      return token;
    } catch (err) {
      this.error.value = err instanceof Error ? err.message : '创建Token失败';
      throw err;
    } finally {
      this.isLoading.value = false;
    }
  }

  async deleteToken(id: string): Promise<void> {
    this.isLoading.value = true;
    this.error.value = null;
    try {
      await apiTokenApi.deleteToken(id);
      // Remove from local list
      this.tokens.value = this.tokens.value.filter((t) => t.id !== id);
    } catch (err) {
      this.error.value = err instanceof Error ? err.message : '删除Token失败';
      throw err;
    } finally {
      this.isLoading.value = false;
    }
  }
}
