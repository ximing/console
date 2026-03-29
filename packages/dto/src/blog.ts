/**
 * Blog DTOs for blog posts, directories, and tags
 */

/**
 * Tag DTO - labels for categorizing blogs
 */
export interface TagDto {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for creating a new tag
 */
export interface CreateTagDto {
  name: string;
  color?: string;
}

/**
 * DTO for updating an existing tag
 */
export interface UpdateTagDto {
  name?: string;
  color?: string;
}

/**
 * Directory DTO - hierarchical folder structure for organizing blogs
 */
export interface DirectoryDto {
  id: string;
  userId: string;
  name: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for creating a new directory
 */
export interface CreateDirectoryDto {
  name: string;
  parentId?: string;
}

/**
 * DTO for updating an existing directory
 */
export interface UpdateDirectoryDto {
  name?: string;
  parentId?: string | null;
}

/**
 * Blog DTO - represents a blog post
 */
export interface BlogDto {
  id: string;
  userId: string;
  title: string;
  content?: Record<string, unknown>;
  excerpt?: string;
  slug: string;
  directoryId?: string;
  status: 'draft' | 'published';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: Array<{ id: string; name: string; color: string }>;
}

/**
 * DTO for creating a new blog
 */
export interface CreateBlogDto {
  title: string;
  content?: Record<string, unknown>;
  excerpt?: string;
  slug?: string;
  directoryId?: string;
  tagIds?: string[];
}

/**
 * DTO for updating an existing blog
 */
export interface UpdateBlogDto {
  title?: string;
  content?: Record<string, unknown>;
  excerpt?: string;
  slug?: string;
  directoryId?: string | null;
  status?: 'draft' | 'published';
  tagIds?: string[];
  updatedAt?: string;
}

/**
 * DTO for blog list response
 */
export interface BlogListDto {
  blogs: BlogDto[];
  total: number;
}

/**
 * DTO for directory tree response
 */
export interface DirectoryListDto {
  directories: DirectoryDto[];
}

/**
 * DTO for tag list response
 */
export interface TagListDto {
  tags: TagDto[];
}
