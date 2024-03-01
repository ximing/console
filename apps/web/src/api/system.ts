import type { AllVersionsResponseDto } from '@aimo-console/dto';
import request from '../utils/request';

/**
 * Get server version
 */
export const getVersion = () => {
  return request.get<unknown, { code: number; msg: string; data: { version: string } }>(
    '/api/v1/system/version'
  );
};

/**
 * Get latest app versions from GitHub releases
 * Public endpoint - no authentication required
 */
export const getAppVersions = () => {
  return request.get<unknown, { code: number; msg: string; data: AllVersionsResponseDto }>(
    '/api/v1/system/app-versions'
  );
};
