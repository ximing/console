import { mysqlTable, varchar, index } from 'drizzle-orm/mysql-core';
import { blogs } from './blog.js';
import { tags } from './tag.js';

/**
 * BlogTag junction table - many-to-many relationship between blogs and tags
 */
export const blogTags = mysqlTable(
  'blog_tags',
  {
    blogId: varchar('blog_id', { length: 191 })
      .notNull()
      .references(() => blogs.id, { onDelete: 'cascade' }),
    tagId: varchar('tag_id', { length: 191 })
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    blogIdIdx: index('blog_id_idx').on(table.blogId),
    tagIdIdx: index('tag_id_idx').on(table.tagId),
    // Composite primary key
    pk: index('pk').on(table.blogId, table.tagId),
  })
);

export type BlogTag = typeof blogTags.$inferSelect;
export type NewBlogTag = typeof blogTags.$inferInsert;
