export interface BlogVisitorDto {
  id: string;
  githubId: string;
  login: string;
  name?: string;
  avatarUrl?: string;
  status: 'active' | 'blocked';
  createdAt: string;
  lastLoginAt: string;
  commentCount?: number;
}

export interface BlogCommentAuthorDto {
  id: string;
  login: string;
  name?: string;
  avatarUrl?: string;
}

export interface BlogCommentDto {
  id: string;
  postPath: string;
  author: BlogCommentAuthorDto;
  parentId?: string;
  content: string;
  status: 'visible' | 'deleted';
  likeCount: number;
  createdAt: string;
  replies?: BlogCommentDto[];
}

export interface BlogPostStatsDto {
  postPath: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export interface BlogLikeInfoDto {
  targetId: string;
  likeCount: number;
  likedByMe: boolean;
}

export interface BlogEngagementOverviewDto {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalVisitors: number;
  posts: BlogPostStatsDto[];
}
