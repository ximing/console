import { mysqlTable, varchar, timestamp, customType } from 'drizzle-orm/mysql-core';

/**
 * Custom LONGBLOB type for MySQL
 * Supports storing binary data up to 4GB
 */
const longblob = customType<{
  data: Buffer;
  driverData: Buffer;
}>({
  dataType() {
    return 'LONGBLOB';
  },
});

/**
 * Yjs Document State Table
 * Stores the binary state of Yjs documents for collaboration persistence
 * Uses LONGBLOB for direct binary storage (no base64 encoding)
 */
export const yjsDocuments = mysqlTable('yjs_documents', {
  docName: varchar('doc_name', { length: 255 }).primaryKey(),
  data: longblob('data').notNull(), // LONGBLOB - direct binary storage
  createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type YjsDocument = typeof yjsDocuments.$inferSelect;
