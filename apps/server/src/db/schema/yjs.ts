import { mysqlTable, varchar, timestamp, varbinary } from 'drizzle-orm/mysql-core';

/**
 * Yjs Document State Table
 * Stores the binary state of Yjs documents for collaboration persistence
 * Uses VARBINARY for direct binary storage (no base64 encoding)
 */
export const yjsDocuments = mysqlTable('yjs_documents', {
  docName: varchar('doc_name', { length: 255 }).primaryKey(),
  data: varbinary('data').notNull(), // VARBINARY - direct binary storage
  createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type YjsDocument = typeof yjsDocuments.$inferSelect;
