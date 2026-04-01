/**
 * Blog Controller - REST API for blog posts, directories, and tags
 */

import {
  JsonController,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  QueryParams,
  CurrentUser,
} from 'routing-controllers';
import { Service } from 'typedi';

import { ErrorCode } from '../../constants/error-codes.js';
import { BlogService } from '../../services/blog.service.js';
import { DirectoryService } from '../../services/directory.service.js';
import { TagService } from '../../services/tag.service.js';
import { logger } from '../../utils/logger.js';
import { ResponseUtil as ResponseUtility } from '../../utils/response.js';
import { slugify, generateUniqueSlug } from '../../utils/slugify.js';
import { getDatabase } from '../../db/connection.js';
import { blogs } from '../../db/schema/blog.js';
import { eq } from 'drizzle-orm';

import type {
  BlogDto,
  BlogListDto,
  CreateBlogDto,
  UpdateBlogDto,
  DirectoryDto,
  DirectoryListDto,
  CreateDirectoryDto,
  UpdateDirectoryDto,
  TagDto,
  TagListDto,
  CreateTagDto,
  UpdateTagDto,
  UserInfoDto,
} from '@x-console/dto';
import type { Blog, Tag, Directory } from '../../db/schema/index.js';

/**
 * Helper to convert Blog with tags to BlogDto
 */
function convertBlogToDto(
  blog: Blog & { tags?: Array<{ id: string; name: string; color: string }> }
): BlogDto {
  return {
    id: blog.id,
    userId: blog.userId,
    title: blog.title,
    content: blog.content as Record<string, unknown> | undefined,
    excerpt: blog.excerpt ?? undefined,
    slug: blog.slug,
    directoryId: blog.directoryId ?? undefined,
    status: blog.status as 'draft' | 'published',
    publishedAt: blog.publishedAt
      ? blog.publishedAt instanceof Date
        ? blog.publishedAt.toISOString()
        : blog.publishedAt
      : undefined,
    createdAt: blog.createdAt instanceof Date ? blog.createdAt.toISOString() : blog.createdAt,
    updatedAt: blog.updatedAt instanceof Date ? blog.updatedAt.toISOString() : blog.updatedAt,
    tags: (blog.tags ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
    })),
  };
}

/**
 * Helper to convert Directory to DirectoryDto
 */
function convertDirectoryToDto(directory: Directory): DirectoryDto {
  return {
    id: directory.id,
    userId: directory.userId,
    name: directory.name,
    parentId: directory.parentId ?? undefined,
    createdAt:
      directory.createdAt instanceof Date ? directory.createdAt.toISOString() : directory.createdAt,
    updatedAt:
      directory.updatedAt instanceof Date ? directory.updatedAt.toISOString() : directory.updatedAt,
  };
}

/**
 * Helper to convert Tag to TagDto
 */
function convertTagToDto(tag: Tag): TagDto {
  return {
    id: tag.id,
    userId: tag.userId,
    name: tag.name,
    color: tag.color,
    createdAt: tag.createdAt instanceof Date ? tag.createdAt.toISOString() : tag.createdAt,
    updatedAt: tag.updatedAt instanceof Date ? tag.updatedAt.toISOString() : tag.updatedAt,
  };
}

@Service()
@JsonController('/api/v1/blogs')
export class BlogController {
  constructor(
    private blogService: BlogService,
    private directoryService: DirectoryService,
    private tagService: TagService
  ) {}

  // ==================== Blog Endpoints ====================

  /**
   * GET /api/v1/blogs - List all blogs for current user
   */
  @Get('/')
  async listBlogs(
    @CurrentUser() userDto: UserInfoDto,
    @QueryParams()
    params: {
      page?: string;
      pageSize?: string;
      directoryId?: string;
      tagId?: string;
      status?: string;
      search?: string;
    }
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const page = params.page ? parseInt(params.page, 10) : 1;
      const pageSize = params.pageSize ? parseInt(params.pageSize, 10) : 20;

      if (isNaN(page) || page < 1 || isNaN(pageSize) || pageSize < 1) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Invalid pagination parameters');
      }

      const result = await this.blogService.getBlogs({
        userId: userDto.id,
        page,
        pageSize,
        directoryId: params.directoryId,
        tagId: params.tagId,
        status: params.status as 'draft' | 'published' | 'all' | undefined,
        search: params.search,
      });

      const blogDtos: BlogDto[] = result.data.map(convertBlogToDto);

      const response: BlogListDto = {
        blogs: blogDtos,
        total: result.total,
      };

      return ResponseUtility.success(response);
    } catch (error) {
      logger.error('List blogs error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * POST /api/v1/blogs - Create a new blog
   */
  @Post('/')
  async createBlog(@CurrentUser() userDto: UserInfoDto, @Body() createData: CreateBlogDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!createData.title || createData.title.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Title is required');
      }

      // Generate slug from title if not provided
      let slug = createData.slug?.trim() || slugify(createData.title);

      // Ensure slug is unique for this user
      if (!createData.slug) {
        const db = getDatabase();
        const existingSlugs = await db
          .select({ slug: blogs.slug })
          .from(blogs)
          .where(eq(blogs.userId, userDto.id));
        slug = generateUniqueSlug(
          slug,
          existingSlugs.map((s) => s.slug)
        );
      }

      const blog = await this.blogService.createBlog(userDto.id, {
        title: createData.title.trim(),
        content: createData.content,
        excerpt: createData.excerpt,
        slug,
        directoryId: createData.directoryId,
        tagIds: createData.tagIds,
      });

      // Fetch the created blog with tags
      const createdBlog = await this.blogService.getBlog(blog.id, userDto.id);

      return ResponseUtility.success(convertBlogToDto(createdBlog!));
    } catch (error) {
      logger.error('Create blog error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  // ==================== Directory Endpoints ====================

  /**
   * GET /api/v1/blogs/directories - List all directories for current user
   */
  @Get('/directories')
  async listDirectories(@CurrentUser() userDto: UserInfoDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const directories = await this.directoryService.getDirectoryTree(userDto.id);
      const directoryDtos = directories.map(convertDirectoryToDto);

      const response: DirectoryListDto = {
        directories: directoryDtos,
      };

      return ResponseUtility.success(response);
    } catch (error) {
      logger.error('List directories error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * POST /api/v1/blogs/directories - Create a new directory
   */
  @Post('/directories')
  async createDirectory(
    @CurrentUser() userDto: UserInfoDto,
    @Body() createData: CreateDirectoryDto
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!createData.name || createData.name.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Directory name is required');
      }

      // Validate parent directory if provided
      if (createData.parentId) {
        const parent = await this.directoryService.getDirectory(createData.parentId, userDto.id);
        if (!parent) {
          return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Parent directory not found');
        }
      }

      const directory = await this.directoryService.createDirectory(userDto.id, {
        name: createData.name.trim(),
        parentId: createData.parentId,
      });

      return ResponseUtility.success(convertDirectoryToDto(directory));
    } catch (error) {
      logger.error('Create directory error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * PUT /api/v1/blogs/directories/:id - Update a directory
   */
  @Put('/directories/:id')
  async updateDirectory(
    @CurrentUser() userDto: UserInfoDto,
    @Param('id') id: string,
    @Body() updateData: UpdateDirectoryDto
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Check if directory exists
      const existing = await this.directoryService.getDirectory(id, userDto.id);
      if (!existing) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Directory not found');
      }

      // Validate parent directory if provided
      if (updateData.parentId) {
        // Prevent setting self as parent
        if (updateData.parentId === id) {
          return ResponseUtility.error(
            ErrorCode.PARAMS_ERROR,
            'Directory cannot be its own parent'
          );
        }
        const parent = await this.directoryService.getDirectory(updateData.parentId, userDto.id);
        if (!parent) {
          return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Parent directory not found');
        }
      }

      const directory = await this.directoryService.updateDirectory(id, userDto.id, {
        name: updateData.name?.trim(),
        parentId: updateData.parentId,
      });

      if (!directory) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Directory not found');
      }

      return ResponseUtility.success(convertDirectoryToDto(directory));
    } catch (error) {
      logger.error('Update directory error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * DELETE /api/v1/blogs/directories/:id - Delete a directory
   */
  @Delete('/directories/:id')
  async deleteDirectory(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const deleted = await this.directoryService.deleteDirectory(id, userDto.id);
      if (!deleted) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Directory not found');
      }

      return ResponseUtility.success({ deleted: true });
    } catch (error) {
      logger.error('Delete directory error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  // ==================== Tag Endpoints ====================

  /**
   * GET /api/v1/blogs/tags - List all tags for current user
   */
  @Get('/tags')
  async listTags(@CurrentUser() userDto: UserInfoDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const tags = await this.tagService.getTags(userDto.id);
      const tagDtos = tags.map(convertTagToDto);

      const response: TagListDto = {
        tags: tagDtos,
      };

      return ResponseUtility.success(response);
    } catch (error) {
      logger.error('List tags error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * POST /api/v1/blogs/tags - Create a new tag
   */
  @Post('/tags')
  async createTag(@CurrentUser() userDto: UserInfoDto, @Body() createData: CreateTagDto) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      if (!createData.name || createData.name.trim().length === 0) {
        return ResponseUtility.error(ErrorCode.PARAMS_ERROR, 'Tag name is required');
      }

      const tag = await this.tagService.createTag(userDto.id, {
        name: createData.name.trim(),
        color: createData.color,
      });

      return ResponseUtility.success(convertTagToDto(tag));
    } catch (error) {
      logger.error('Create tag error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * PUT /api/v1/blogs/tags/:id - Update a tag
   */
  @Put('/tags/:id')
  async updateTag(
    @CurrentUser() userDto: UserInfoDto,
    @Param('id') id: string,
    @Body() updateData: UpdateTagDto
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const tag = await this.tagService.updateTag(id, userDto.id, {
        name: updateData.name?.trim(),
        color: updateData.color,
      });

      if (!tag) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Tag not found');
      }

      return ResponseUtility.success(convertTagToDto(tag));
    } catch (error) {
      logger.error('Update tag error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * DELETE /api/v1/blogs/tags/:id - Delete a tag
   */
  @Delete('/tags/:id')
  async deleteTag(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const deleted = await this.tagService.deleteTag(id, userDto.id);
      if (!deleted) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Tag not found');
      }

      return ResponseUtility.success({ deleted: true });
    } catch (error) {
      logger.error('Delete tag error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * GET /api/v1/blogs/:id - Get blog details
   */
  @Get('/:id')
  async getBlog(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const blog = await this.blogService.getBlog(id, userDto.id);
      if (!blog) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Blog not found');
      }

      return ResponseUtility.success(convertBlogToDto(blog));
    } catch (error) {
      logger.error('Get blog error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * PUT /api/v1/blogs/:id - Update a blog
   */
  @Put('/:id')
  async updateBlog(
    @CurrentUser() userDto: UserInfoDto,
    @Param('id') id: string,
    @Body() updateData: UpdateBlogDto
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      // Check if blog exists
      const existingBlog = await this.blogService.getBlog(id, userDto.id);
      if (!existingBlog) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Blog not found');
      }

      // Validate slug uniqueness if being changed
      if (updateData.slug && updateData.slug !== existingBlog.slug) {
        const db = getDatabase();
        const existingSlugs = await db
          .select({ slug: blogs.slug })
          .from(blogs)
          .where(eq(blogs.userId, userDto.id));
        const otherSlugs = existingSlugs
          .filter((s) => s.slug !== existingBlog.slug)
          .map((s) => s.slug);
        const newSlug = generateUniqueSlug(updateData.slug, otherSlugs);
        updateData.slug = newSlug;
      }

      const updatedBlog = await this.blogService.updateBlog(id, userDto.id, {
        title: updateData.title?.trim(),
        content: updateData.content,
        excerpt: updateData.excerpt,
        slug: updateData.slug,
        directoryId: updateData.directoryId,
        status: updateData.status,
        tagIds: updateData.tagIds,
      });

      if (!updatedBlog) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Blog not found');
      }

      // Fetch the updated blog with tags
      const blogWithTags = await this.blogService.getBlog(id, userDto.id);

      return ResponseUtility.success(convertBlogToDto(blogWithTags!));
    } catch (error) {
      logger.error('Update blog error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * DELETE /api/v1/blogs/:id - Delete a blog
   */
  @Delete('/:id')
  async deleteBlog(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const deleted = await this.blogService.deleteBlog(id, userDto.id);
      if (!deleted) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Blog not found');
      }

      return ResponseUtility.success({ deleted: true });
    } catch (error) {
      logger.error('Delete blog error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * POST /api/v1/blogs/:id/publish - Publish a blog
   */
  @Post('/:id/publish')
  async publishBlog(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const existingBlog = await this.blogService.getBlog(id, userDto.id);
      if (!existingBlog) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Blog not found');
      }

      const blog = await this.blogService.publishBlog(id, userDto.id);
      if (!blog) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Blog not found');
      }

      const blogWithTags = await this.blogService.getBlog(id, userDto.id);

      return ResponseUtility.success(convertBlogToDto(blogWithTags!));
    } catch (error) {
      logger.error('Publish blog error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * POST /api/v1/blogs/:id/unpublish - Unpublish a blog
   */
  @Post('/:id/unpublish')
  async unpublishBlog(@CurrentUser() userDto: UserInfoDto, @Param('id') id: string) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      const existingBlog = await this.blogService.getBlog(id, userDto.id);
      if (!existingBlog) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Blog not found');
      }

      const blog = await this.blogService.unpublishBlog(id, userDto.id);
      if (!blog) {
        return ResponseUtility.error(ErrorCode.NOT_FOUND, 'Blog not found');
      }

      const blogWithTags = await this.blogService.getBlog(id, userDto.id);

      return ResponseUtility.success(convertBlogToDto(blogWithTags!));
    } catch (error) {
      logger.error('Unpublish blog error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * PATCH /api/v1/blogs/:id/snapshot - Save collaboration snapshot for a blog
   */
  @Patch('/:id/snapshot')
  async saveSnapshot(
    @CurrentUser() userDto: UserInfoDto,
    @Param('id') id: string,
    @Body() body: { contentSnapshot: string }
  ) {
    try {
      if (!userDto?.id) {
        return ResponseUtility.error(ErrorCode.UNAUTHORIZED);
      }

      await this.blogService.saveSnapshot(id, userDto.id, body.contentSnapshot);
      return { success: true };
    } catch (error) {
      logger.error('Save snapshot error:', error);
      return ResponseUtility.error(ErrorCode.DB_ERROR);
    }
  }
}
