export interface CommentTreeNode<T> {
  item: T;
  replies: T[];
}

/**
 * Builds a one-level comment tree: top-level comments (parentId == null) sorted
 * ascending by createdAt, each with its replies sorted ascending.
 * Replies whose parent is missing from the input are dropped.
 */
export function buildCommentTree<T extends { id: string; parentId: string | null; createdAt: Date }>(
  comments: T[]
): CommentTreeNode<T>[] {
  const byTimeAsc = (a: T, b: T) => a.createdAt.getTime() - b.createdAt.getTime();
  const tops = comments.filter((c) => !c.parentId).sort(byTimeAsc);
  const topIds = new Set(tops.map((t) => t.id));
  const replies = comments.filter((c) => c.parentId && topIds.has(c.parentId));
  return tops.map((top) => ({
    item: top,
    replies: replies.filter((r) => r.parentId === top.id).sort(byTimeAsc),
  }));
}
