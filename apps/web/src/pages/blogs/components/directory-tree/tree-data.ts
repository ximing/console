import type { DirectoryTreeNode } from '../../../../services/directory.service';
import type { BlogDto } from '@x-console/dto';
import type { TreeNodeData, DirectoryTreeNodeData, BlogTreeNodeData } from './types';

/**
 * Transform DirectoryTreeNode to DirectoryTreeNodeData for react-arborist
 */
function transformDirectory(
  node: DirectoryTreeNode,
  blogsByDirectory: Map<string, BlogDto[]>
): DirectoryTreeNodeData {
  const children: TreeNodeData[] = [];

  // Add child directories
  for (const child of node.children) {
    children.push(transformDirectory(child, blogsByDirectory));
  }

  // Add blogs belonging to this directory
  const dirBlogs = blogsByDirectory.get(node.id) || [];
  for (const blog of dirBlogs) {
    children.push(transformBlog(blog));
  }

  return {
    id: node.id,
    type: 'directory',
    name: node.name,
    children,
  };
}

/**
 * Transform BlogDto to BlogTreeNodeData
 */
function transformBlog(blog: BlogDto): BlogTreeNodeData {
  return {
    id: blog.id,
    type: 'blog',
    title: blog.title,
    directoryId: blog.directoryId,
  };
}

/**
 * Build unified tree data from directories and blogs for react-arborist
 */
export function buildTreeData(
  directoryTree: DirectoryTreeNode[],
  blogs: BlogDto[]
): TreeNodeData[] {
  // Group blogs by directoryId
  const blogsByDirectory = new Map<string, BlogDto[]>();
  for (const blog of blogs) {
    if (blog.directoryId) {
      const existing = blogsByDirectory.get(blog.directoryId) || [];
      existing.push(blog);
      blogsByDirectory.set(blog.directoryId, existing);
    }
  }

  // Transform directory tree with nested blogs
  const result: TreeNodeData[] = [];
  for (const node of directoryTree) {
    result.push(transformDirectory(node, blogsByDirectory));
  }

  return result;
}

/**
 * Get root-level blogs (blogs without directoryId)
 */
export function getRootBlogs(blogs: BlogDto[]): BlogTreeNodeData[] {
  return blogs
    .filter((b) => !b.directoryId)
    .map((b) => transformBlog(b));
}
