import { JsonController, Get, Post, Put, Delete, Body, Param, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { GithubRepoService } from '../../services/github-repo.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil } from '../../utils/response.js';

import type {
  CreateGithubRepoDto,
  UpdateGithubRepoDto,
  GithubRepoDto,
  GithubRepoListDto,
  GithubRepoTokenDto,
  UserInfoDto,
} from '@x-console/dto';

/**
 * Helper to convert repo to DTO
 */
function convertToDto(repo: {
  id: string;
  name: string;
  fullName: string;
  createdAt: Date;
  updatedAt: Date;
}): GithubRepoDto {
  return {
    id: repo.id,
    name: repo.name,
    full_name: repo.fullName,
    created_at: repo.createdAt instanceof Date ? repo.createdAt.toISOString() : String(repo.createdAt),
    updated_at: repo.updatedAt instanceof Date ? repo.updatedAt.toISOString() : String(repo.updatedAt),
  };
}

@Service()
@JsonController('/api/v1/github/repos')
export class GithubController {
  constructor(private githubRepoService: GithubRepoService) {}

  /**
   * GET /api/v1/github/repos - Get all repos for current user
   * Returns repos without decrypted PAT
   */
  @Get('/')
  async getRepos(@CurrentUser() userDto: UserInfoDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const repos = await this.githubRepoService.getRepos(userDto.id);
      const repoDtos = repos.map((r) => convertToDto(r));

      const response: GithubRepoListDto = {
        repos: repoDtos,
      };

      return ResponseUtil.success(response);
    } catch (error) {
      logger.error('Get GitHub repos error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * POST /api/v1/github/repos - Create a new repo
   * Encrypts PAT before storing
   */
  @Post('/')
  async createRepo(@CurrentUser() userDto: UserInfoDto, @Body() createData: CreateGithubRepoDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      // Validate required fields
      if (!createData.name || createData.name.trim().length === 0) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Repository name is required');
      }

      if (!createData.full_name || createData.full_name.trim().length === 0) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Repository full name is required (format: owner/repo)');
      }

      if (!createData.pat || createData.pat.trim().length === 0) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'PAT (Personal Access Token) is required');
      }

      const repo = await this.githubRepoService.createRepo(userDto.id, {
        name: createData.name.trim(),
        full_name: createData.full_name.trim(),
        pat: createData.pat.trim(),
      });

      const dto: GithubRepoDto = convertToDto(repo);

      return ResponseUtil.success(dto);
    } catch (error) {
      logger.error('Create GitHub repo error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * PUT /api/v1/github/repos/:id - Update a repo
   */
  @Put('/:id')
  async updateRepo(
    @CurrentUser() userDto: UserInfoDto,
    @Param('id') id: string,
    @Body() updateData: UpdateGithubRepoDto
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const repo = await this.githubRepoService.updateRepo(id, userDto.id, {
        name: updateData.name?.trim(),
        full_name: updateData.full_name?.trim(),
        pat: updateData.pat?.trim(),
      });

      if (!repo) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Repository not found');
      }

      const dto: GithubRepoDto = convertToDto(repo);

      return ResponseUtil.success(dto);
    } catch (error) {
      logger.error('Update GitHub repo error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * DELETE /api/v1/github/repos/:id - Delete a repo
   */
  @Delete('/:id')
  async deleteRepo(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const deleted = await this.githubRepoService.deleteRepo(id, userDto.id);

      if (!deleted) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Repository not found');
      }

      return ResponseUtil.success({ deleted: true });
    } catch (error) {
      logger.error('Delete GitHub repo error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * GET /api/v1/github/repos/:id/token - Get decrypted PAT for a repo
   */
  @Get('/:id/token')
  async getToken(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED);
      }

      const token = await this.githubRepoService.getRepoToken(id, userDto.id);

      if (token === null) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Repository not found');
      }

      const response: GithubRepoTokenDto = {
        id,
        pat: token,
      };

      return ResponseUtil.success(response);
    } catch (error) {
      logger.error('Get GitHub repo token error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }
}
