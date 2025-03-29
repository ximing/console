import { Service } from '@rabjs/react';

import { blogEngagementApi } from '../../api/blog-engagement';
import { toast } from '../../services/toast.service';

import type { AdminBlogComment } from '../../api/blog-engagement';
import type { BlogEngagementOverviewDto, BlogVisitorDto } from '@x-console/dto';

export type BlogEngagementTab = 'comments' | 'stats' | 'visitors';

const PAGE_SIZE = 20;

export class BlogEngagementService extends Service {
  activeTab: BlogEngagementTab = 'comments';

  comments: AdminBlogComment[] = [];
  commentsTotal = 0;
  commentsPage = 1;
  filterPostPath = '';
  filterStatus = '';
  loading = false;

  overview: BlogEngagementOverviewDto | null = null;

  visitors: BlogVisitorDto[] = [];
  visitorsTotal = 0;
  visitorsPage = 1;

  setTab(tab: BlogEngagementTab): void {
    this.activeTab = tab;
    if (tab === 'comments' && !this.comments.length) void this.loadComments(1);
    if (tab === 'stats' && !this.overview) void this.loadOverview();
    if (tab === 'visitors' && !this.visitors.length) void this.loadVisitors(1);
  }

  async loadComments(page: number): Promise<void> {
    this.loading = true;
    try {
      const data = await blogEngagementApi.getComments({
        page,
        pageSize: PAGE_SIZE,
        postPath: this.filterPostPath || undefined,
        status: this.filterStatus || undefined,
      });
      this.comments = data.comments;
      this.commentsTotal = data.total;
      this.commentsPage = page;
    } catch {
      toast.error('加载评论失败');
    } finally {
      this.loading = false;
    }
  }

  async setCommentStatus(id: string, status: 'visible' | 'deleted'): Promise<void> {
    try {
      await blogEngagementApi.updateCommentStatus(id, status);
      this.comments = this.comments.map((c) => (c.id === id ? { ...c, status } : c));
      toast.success(status === 'deleted' ? '评论已删除' : '评论已恢复');
    } catch {
      toast.error('操作失败');
    }
  }

  async loadOverview(): Promise<void> {
    this.loading = true;
    try {
      this.overview = await blogEngagementApi.getOverview();
    } catch {
      toast.error('加载统计数据失败');
    } finally {
      this.loading = false;
    }
  }

  async loadVisitors(page: number): Promise<void> {
    this.loading = true;
    try {
      const data = await blogEngagementApi.getVisitors({ page, pageSize: PAGE_SIZE });
      this.visitors = data.visitors;
      this.visitorsTotal = data.total;
      this.visitorsPage = page;
    } catch {
      toast.error('加载访客失败');
    } finally {
      this.loading = false;
    }
  }

  async setVisitorStatus(id: string, status: 'active' | 'blocked'): Promise<void> {
    try {
      await blogEngagementApi.updateVisitorStatus(id, status);
      this.visitors = this.visitors.map((v) => (v.id === id ? { ...v, status } : v));
      toast.success(status === 'blocked' ? '访客已拉黑' : '访客已解封');
    } catch {
      toast.error('操作失败');
    }
  }
}

export const blogEngagementService = new BlogEngagementService();
