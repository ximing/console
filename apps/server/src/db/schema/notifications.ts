import { mysqlTable, varchar, timestamp, index, mysqlEnum, text } from 'drizzle-orm/mysql-core';

/**
 * Notifications table - stores message notifications from different channels
 */
export const notifications = mysqlTable(
  'notifications',
  {
    id: varchar('id', { length: 191 }).primaryKey().notNull(),
    channel: mysqlEnum('channel', [
      'wechat',
      'feishu',
      'dingtalk',
      'slack',
      'email',
      'webhook',
    ]).notNull(),
    ownership: mysqlEnum('ownership', ['group', 'private']).notNull(),
    ownershipId: varchar('ownership_id', { length: 191 }).notNull(),
    content: text('content').notNull(),
    messageType: mysqlEnum('message_type', ['text', 'image', 'file', 'link', 'mixed'])
      .notNull()
      .default('text'),
    status: mysqlEnum('status', ['unread', 'read']).notNull().default('unread'),
    createdAt: timestamp('created_at', { mode: 'date', fsp: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', fsp: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    channelIdx: index('notifications_channel_idx').on(table.channel),
    ownershipIdx: index('notifications_ownership_idx').on(table.ownership),
    ownershipIdIdx: index('notifications_ownership_id_idx').on(table.ownershipId),
    statusIdx: index('notifications_status_idx').on(table.status),
    createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
  })
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
