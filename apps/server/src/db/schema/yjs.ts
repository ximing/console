import { varchar, datetime, text, mysqlTable } from 'drizzle-orm/mysql-core';

/**
 * Yjs Document State Table
 * Stores the binary state of Yjs documents for collaboration persistence
 */
export const yjsDocuments = mysqlTable('yjs_documents', {
  docName: varchar('doc_name', { length: 255 }).primaryKey(),
  data: text('data').notNull(), // Base64 encoded Yjs state
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default('CURRENT_TIMESTAMP(3)'),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default('CURRENT_TIMESTAMP(3)'),
});

export type YjsDocument = typeof yjsDocuments.$inferSelect;
