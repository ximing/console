import { JsonController, Get, QueryParams, CurrentUser } from 'routing-controllers';
import { Service } from 'typedi';
import { GithubActionsService } from '../../services/github-actions.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil } from '../../utils/response.js';
import type { UserInfoDto, WorkflowRunsResponseDto } from '@x-console/dto';

@Service()
@JsonController('/api/v1/github/actions')
export class GithubActionsController {
  constructor(private githubActionsService: GithubActionsService) {}

  @Get('/runs')
  async getRuns(
    @CurrentUser() userDto: UserInfoDto,
    @QueryParams() query: { status?: string }
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtil.error(401, 'Unauthorized');
      }

      const runs = await this.githubActionsService.getWorkflowRuns(userDto.id, {
        status: query.status,
      });

      const response: WorkflowRunsResponseDto = {
        runs,
        total_count: runs.length,
      };

      return ResponseUtil.success(response);
    } catch (error) {
      logger.error('Get workflow runs error:', error);
      return ResponseUtil.error(500, 'Failed to fetch workflow runs');
    }
  }
}
