import type {
  BlogDto,
  CreateBlogDto,
  UpdateBlogDto,
  BlogListDto,
  DirectoryDto,
  CreateDirectoryDto,
  UpdateDirectoryDto,
  DirectoryListDto,
  TagDto,
  CreateTagDto,
  UpdateTagDto,
  TagListDto,
} from '@x-console/dto';
import request from '../utils/request';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

/**
 * Blog API endpoints
 */
export const blogApi = {
  /**
   * Get all blogs with pagination
   */
  getBlogs: async (params?: {
    page?: number;
    pageSize?: number;
    directoryId?: string;
    status?: 'draft' | 'published';
    tagId?: string;
    search?: string;
  }): Promise<BlogListDto> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.directoryId) searchParams.set('directoryId', params.directoryId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.tagId) searchParams.set('tagId', params.tagId);
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    const response = await request.get<unknown, ApiResponse<BlogListDto>>(
      `/api/v1/blogs${query ? `?${query}` : ''}`
    );
    return response.data;
  },

  /**
   * Get a single blog by ID
   */
  getBlog: async (id: string): Promise<BlogDto> => {
    const response = await request.get<unknown, ApiResponse<BlogDto>>(`/api/v1/blogs/${id}`);
    return response.data;
  },

  /**
   * Create a new blog
   */
  createBlog: async (data: CreateBlogDto): Promise<BlogDto> => {
    const response = await request.post<CreateBlogDto, ApiResponse<BlogDto>>('/api/v1/blogs', data);
    return response.data;
  },

  /**
   * Update a blog
   */
  updateBlog: async (id: string, data: UpdateBlogDto): Promise<BlogDto> => {
    const response = await request.put<UpdateBlogDto, ApiResponse<BlogDto>>(
      `/api/v1/blogs/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a blog
   */
  deleteBlog: async (id: string): Promise<{ deleted: boolean }> => {
    const response = await request.delete<unknown, ApiResponse<{ deleted: boolean }>>(
      `/api/v1/blogs/${id}`
    );
    return response.data;
  },

  /**
   * Publish a blog
   */
  publishBlog: async (id: string): Promise<BlogDto> => {
    const response = await request.post<unknown, ApiResponse<BlogDto>>(
      `/api/v1/blogs/${id}/publish`
    );
    return response.data;
  },

  /**
   * Unpublish a blog
   */
  unpublishBlog: async (id: string): Promise<BlogDto> => {
    const response = await request.post<unknown, ApiResponse<BlogDto>>(
      `/api/v1/blogs/${id}/unpublish`
    );
    return response.data;
  },

  /**
   * Save collaboration snapshot for a blog
   */
  saveSnapshot: async (blogId: string, contentSnapshot: string): Promise<void> => {
    await request.patch(`/api/v1/blogs/${blogId}/snapshot`, { contentSnapshot });
  },

  /**
   * Get collaboration snapshot for a blog
   */
  getSnapshot: async (blogId: string): Promise<{ contentSnapshot: string | null; lastSnapshotAt: string | null }> => {
    const response = await request.get<unknown, ApiResponse<{ contentSnapshot: string | null; lastSnapshotAt: string | null }>>(
      `/api/v1/blogs/${blogId}/snapshot`
    );
    return response.data;
  },
};

/**
 * Directory API endpoints
 */
export const directoryApi = {
  /**
   * Get all directories
   */
  getDirectories: async (): Promise<DirectoryListDto> => {
    const response = await request.get<unknown, ApiResponse<DirectoryListDto>>('/api/v1/blogs/directories');
    return response.data;
  },

  /**
   * Create a new directory
   */
  createDirectory: async (data: CreateDirectoryDto): Promise<DirectoryDto> => {
    const response = await request.post<CreateDirectoryDto, ApiResponse<DirectoryDto>>(
      '/api/v1/blogs/directories',
      data
    );
    return response.data;
  },

  /**
   * Update a directory
   */
  updateDirectory: async (id: string, data: UpdateDirectoryDto): Promise<DirectoryDto> => {
    const response = await request.patch<UpdateDirectoryDto, ApiResponse<DirectoryDto>>(
      `/api/v1/blogs/directories/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a directory
   */
  deleteDirectory: async (id: string): Promise<{ deleted: boolean }> => {
    const response = await request.delete<unknown, ApiResponse<{ deleted: boolean }>>(
      `/api/v1/blogs/directories/${id}`
    );
    return response.data;
  },
};

/**
 * Tag API endpoints
 */
export const tagApi = {
  /**
   * Get all tags
   */
  getTags: async (): Promise<TagListDto> => {
    const response = await request.get<unknown, ApiResponse<TagListDto>>('/api/v1/blogs/tags');
    return response.data;
  },

  /**
   * Create a new tag
   */
  createTag: async (data: CreateTagDto): Promise<TagDto> => {
    const response = await request.post<CreateTagDto, ApiResponse<TagDto>>(
      '/api/v1/blogs/tags',
      data
    );
    return response.data;
  },

  /**
   * Update a tag
   */
  updateTag: async (id: string, data: UpdateTagDto): Promise<TagDto> => {
    const response = await request.patch<UpdateTagDto, ApiResponse<TagDto>>(
      `/api/v1/blogs/tags/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a tag
   */
  deleteTag: async (id: string): Promise<{ deleted: boolean }> => {
    const response = await request.delete<unknown, ApiResponse<{ deleted: boolean }>>(
      `/api/v1/blogs/tags/${id}`
    );
    return response.data;
  },
};
