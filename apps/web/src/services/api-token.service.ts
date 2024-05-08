import { Service } from '@rabjs/react';
import { apiTokenApi } from '../api/api-token';
import type { ApiTokenDto, ApiTokenListDto, CreateApiTokenDto } from '@aimo-console/dto';

export class ApiTokenService extends Service {
  tokens: ApiTokenDto[] = [];
  isLoading = false;
  error: string | null = null;

  async fetchTokens(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    try {
      const data: ApiTokenListDto = await apiTokenApi.getTokens();
      this.tokens = data.tokens;
    } catch (err) {
      this.error = err instanceof Error ? err.message : '获取Token列表失败';
    } finally {
      this.isLoading = false;
    }
  }

  async createToken(data: CreateApiTokenDto): Promise<ApiTokenDto> {
    this.isLoading = true;
    this.error = null;
    try {
      const token = await apiTokenApi.createToken(data);
      // Add to local list (without the plaintext token)
      const tokenWithoutPlaintext: ApiTokenDto = {
        id: token.id,
        name: token.name,
        prefix: token.prefix,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        lastUsedAt: token.lastUsedAt,
      };
      this.tokens = [tokenWithoutPlaintext, ...this.tokens];
      return token;
    } catch (err) {
      this.error = err instanceof Error ? err.message : '创建Token失败';
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  async deleteToken(id: string): Promise<void> {
    this.isLoading = true;
    this.error = null;
    try {
      await apiTokenApi.deleteToken(id);
      // Remove from local list
      this.tokens = this.tokens.filter((t) => t.id !== id);
    } catch (err) {
      this.error = err instanceof Error ? err.message : '删除Token失败';
      throw err;
    } finally {
      this.isLoading = false;
    }
  }
}
