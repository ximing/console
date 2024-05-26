import { JsonController, Get, Post, Delete, Body, Param, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { ApiTokenService, type GeneratedToken } from '../../services/api-token.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';

import type {
  CreateApiTokenDto,
  ApiTokenDto,
  ApiTokenListDto,
  UserInfoDto,
} from '@x-console/dto';

/**
 * Helper to convert token to DTO
 */
function convertToDto(
  token: {
    id: string;
    userId: string;
    name: string;
    prefix: string;
    createdAt: Date;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
  },
  includeToken?: string
): ApiTokenDto {
  return {
    id: token.id,
    name: token.name,
    token: includeToken, // Only included when creating
    prefix: token.prefix,
    createdAt:
      token.createdAt instanceof Date ? token.createdAt.toISOString() : String(token.createdAt),
    expiresAt: token.expiresAt
      ? token.expiresAt instanceof Date
        ? token.expiresAt.toISOString()
        : String(token.expiresAt)
      : null,
    lastUsedAt: token.lastUsedAt
      ? token.lastUsedAt instanceof Date
        ? token.lastUsedAt.toISOString()
        : String(token.lastUsedAt)
      : null,
  };
}

@Service()
@JsonController('/api/v1/user/api-tokens')
export class ApiTokenController {
  constructor(private apiTokenService: ApiTokenService) {}

  /**
   * POST /api/v1/user/api-tokens - Create a new API token
   */
  @Post('/')
  async createToken(@CurrentUser() userDto: UserInfoDto, @Body() createData: CreateApiTokenDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Validate required fields
      if (!createData.name || createData.name.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Token name is required');
      }

      // Calculate expiration date if expiresInDays is provided
      let expiresAt: Date | undefined;
      if (createData.expiresInDays && createData.expiresInDays > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + createData.expiresInDays);
      }

      const token = await this.apiTokenService.generateToken(
        userDto.id,
        createData.name.trim(),
        expiresAt
      );

      // Convert to DTO with plaintext token (only available now)
      const dto: ApiTokenDto = {
        id: token.id,
        name: token.name,
        token: token.token, // Plaintext - only shown once!
        prefix: token.prefix,
        createdAt:
          token.createdAt instanceof Date ? token.createdAt.toISOString() : String(token.createdAt),
        expiresAt: token.expiresAt
          ? token.expiresAt instanceof Date
            ? token.expiresAt.toISOString()
            : String(token.expiresAt)
          : null,
        lastUsedAt: null,
      };

      return ResponseUtility.success(dto);
    } catch (error) {
      logger.error('Create API token error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * GET /api/v1/user/api-tokens - Get all API tokens for current user
   */
  @Get('/')
  async getTokens(@CurrentUser() userDto: UserInfoDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const tokens = await this.apiTokenService.listTokens(userDto.id);
      const tokenDtos = tokens.map((t) => convertToDto(t));

      const response: ApiTokenListDto = {
        tokens: tokenDtos,
      };

      return ResponseUtility.success(response);
    } catch (error) {
      logger.error('Get API tokens error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * DELETE /api/v1/user/api-tokens/:id - Delete an API token
   */
  @Delete('/:id')
  async deleteToken(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const deleted = await this.apiTokenService.deleteToken(id, userDto.id);

      return ResponseUtility.success({ deleted: true });
    } catch (error) {
      logger.error('Delete API token error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
