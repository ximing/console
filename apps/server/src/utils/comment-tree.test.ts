import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildCommentTree } from './comment-tree.js';

const c = (id: string, parentId: string | null, t: number) => ({
  id,
  parentId,
  createdAt: new Date(t),
});

test('groups replies under top-level comments, both time ascending', () => {
  const tree = buildCommentTree([
    c('r2', 't1', 400),
    c('t2', null, 300),
    c('r1', 't1', 200),
    c('t1', null, 100),
  ]);
  assert.deepEqual(
    tree.map((n) => ({ top: n.item.id, replies: n.replies.map((r) => r.id) })),
    [
      { top: 't1', replies: ['r1', 'r2'] },
      { top: 't2', replies: [] },
    ]
  );
});

test('drops orphan replies whose parent is missing', () => {
  const tree = buildCommentTree([c('t1', null, 100), c('rx', 'ghost', 200)]);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].replies.length, 0);
});

test('empty input returns empty tree', () => {
  assert.deepEqual(buildCommentTree([]), []);
});
