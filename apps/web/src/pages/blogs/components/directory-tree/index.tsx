import { useMemo, useCallback } from 'react';
import { view, useService } from '@rabjs/react';
import { Tree } from 'react-arborist';
import type { NodeRendererProps, DropParams } from 'react-arborist';
import { Folder, FileText, Loader2 } from 'lucide-react';
import { DirectoryService } from '../../../../services/directory.service';
import { BlogService } from '../../../../services/blog.service';
import type { BlogDto } from '@x-console/dto';
import type { TreeNodeData } from './types';
import { buildTreeData, getRootBlogs } from './tree-data';
import { DirectoryNode } from './nodes/directory-node';
import { BlogNode } from './nodes/blog-node';
import { useDropHandler } from './hooks/use-drop-handler';
import { useTreeState } from './hooks/use-tree-state';

interface DirectoryTreeProps {
  selectedDirectoryId: string | null;
  selectedPageId: string | null;
  onSelectDirectory: (directoryId: string | null) => void;
  onSelectPage: (pageId: string) => void;
  onContextMenuPage: (e: React.MouseEvent, blog: BlogDto) => void;
  onExpandDirectory?: (directoryId: string) => void;
  onNewBlog: (directoryId?: string) => void;
  onNewDirectory: (parentId?: string) => void;
}

type ArboristNodeProps = NodeRendererProps<TreeNodeData>;

function NodeRenderer({
  node,
  style,
  dragHandle,
  onHover,
  onNewBlog,
  onNewDirectory,
  selectedPageId,
  onSelectPage,
  onContextMenuPage,
  blogService,
}: ArboristNodeProps) {
  if (node.data.type === 'directory') {
    return (
      <DirectoryNode
        node={node}
        style={style}
        dragHandle={dragHandle}
        onHover={onHover}
        onNewBlog={onNewBlog}
        onNewDirectory={onNewDirectory}
      />
    );
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const blog = blogService.blogs.find((b) => b.id === node.data.id);
    if (blog) {
      onContextMenuPage(e, blog);
    }
  };

  return (
    <BlogNode
      node={node}
      style={style}
      dragHandle={dragHandle}
      selectedPageId={selectedPageId}
      onSelectPage={onSelectPage}
      onContextMenu={handleContextMenu}
    />
  );
}

export const DirectoryTree = view(
  ({
    selectedDirectoryId,
    selectedPageId,
    onSelectDirectory,
    onSelectPage,
    onContextMenuPage,
    onNewBlog,
    onNewDirectory,
  }: DirectoryTreeProps) => {
    const directoryService = useService(DirectoryService);
    const blogService = useService(BlogService);
    const { handleDrop } = useDropHandler();
    const { openIdsArray, setOpenIds } = useTreeState();

    // Build tree data from services
    const treeData = useMemo(() => {
      const dirTree = directoryService.buildTree();
      const blogs = blogService.blogs;
      return buildTreeData(dirTree, blogs);
    }, [directoryService.buildTree, blogService.blogs]);

    // Root-level blogs (outside any directory)
    const rootBlogs = useMemo(() => {
      return getRootBlogs(blogService.blogs);
    }, [blogService.blogs]);

    const handleDropCallback = useCallback(
      (params: DropParams<TreeNodeData>) => {
        handleDrop(params, treeData);
      },
      [handleDrop, treeData]
    );

    if (directoryService.loading) {
      return (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500 dark:text-gray-400" />
        </div>
      );
    }

    return (
      <div>
        {/* All Blogs option */}
        <div
          className={`
            flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded mx-2 mb-1
            ${selectedDirectoryId === null ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
          `}
          onClick={() => onSelectDirectory(null)}
        >
          <Folder className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <span className="text-sm">全部博客</span>
        </div>

        {/* Root-level Blogs */}
        {rootBlogs.length > 0 && (
          <div>
            {rootBlogs.map((blog) => (
              <div
                key={blog.id}
                className={`
                  flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded mx-2
                  ${selectedPageId === blog.id ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'hover:bg-gray-100 dark:hover:bg-dark-800 text-gray-700 dark:text-gray-300'}
                `}
                style={{ paddingLeft: '24px' }}
                onClick={() => onSelectPage(blog.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  const foundBlog = blogService.blogs.find((b) => b.id === blog.id);
                  if (foundBlog) onContextMenuPage(e, foundBlog);
                }}
              >
                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="truncate text-sm">{blog.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Directory Tree */}
        {treeData.length > 0 ? (
          <Tree
            data={treeData}
            openIds={openIdsArray}
            onOpenChange={setOpenIds}
            onDrop={handleDropCallback}
            draggable
            enableFatFingers
            width="100%"
          >
            {(props) => (
              <NodeRenderer
                {...props}
                onHover={props.onHover}
                onNewBlog={onNewBlog}
                onNewDirectory={onNewDirectory}
                selectedPageId={selectedPageId}
                onSelectPage={onSelectPage}
                onContextMenuPage={onContextMenuPage}
                blogService={blogService}
              />
            )}
          </Tree>
        ) : (
          <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
            暂无目录
          </div>
        )}
      </div>
    );
  }
);
