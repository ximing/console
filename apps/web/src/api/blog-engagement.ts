import request from '../utils/request';

import type { BlogCommentDto, BlogEngagementOverviewDto, BlogVisitorDto } from '@x-console/dto';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

export type AdminBlogComment = BlogCommentDto & { visitorStatus: string };

export const blogEngagementApi = {
  getComments: async (params: {
    page: number;
    pageSize: number;
    postPath?: string;
    status?: string;
  }): Promise<{ comments: AdminBlogComment[]; total: number }> => {
    const response = await request.get<unknown, ApiResponse<{ comments: AdminBlogComment[]; total: number }>>(
      '/api/v1/admin/blog/comments',
      { params }
    );
    return response.data;
  },

  updateCommentStatus: async (id: string, status: 'visible' | 'deleted'): Promise<void> => {
    await request.patch<unknown, ApiResponse<unknown>>(`/api/v1/admin/blog/comments/${id}`, { status });
  },

  getOverview: async (): Promise<BlogEngagementOverviewDto> => {
    const response = await request.get<unknown, ApiResponse<BlogEngagementOverviewDto>>(
      '/api/v1/admin/blog/stats'
    );
    return response.data;
  },

  getVisitors: async (params: {
    page: number;
    pageSize: number;
  }): Promise<{ visitors: BlogVisitorDto[]; total: number }> => {
    const response = await request.get<unknown, ApiResponse<{ visitors: BlogVisitorDto[]; total: number }>>(
      '/api/v1/admin/blog/visitors',
      { params }
    );
    return response.data;
  },

  updateVisitorStatus: async (id: string, status: 'active' | 'blocked'): Promise<void> => {
    await request.patch<unknown, ApiResponse<unknown>>(`/api/v1/admin/blog/visitors/${id}`, { status });
  },
};
