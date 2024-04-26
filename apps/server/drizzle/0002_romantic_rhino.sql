CREATE TABLE `notifications` (
	`id` varchar(191) NOT NULL,
	`channel` enum('wechat','feishu','dingtalk','slack','email','webhook') NOT NULL,
	`ownership` enum('group','private') NOT NULL,
	`ownership_id` varchar(191) NOT NULL,
	`content` text NOT NULL,
	`message_type` enum('text','image','file','link','mixed') NOT NULL DEFAULT 'text',
	`status` enum('unread','read') NOT NULL DEFAULT 'unread',
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `notifications_channel_idx` ON `notifications` (`channel`);--> statement-breakpoint
CREATE INDEX `notifications_ownership_idx` ON `notifications` (`ownership`);--> statement-breakpoint
CREATE INDEX `notifications_ownership_id_idx` ON `notifications` (`ownership_id`);--> statement-breakpoint
CREATE INDEX `notifications_status_idx` ON `notifications` (`status`);--> statement-breakpoint
CREATE INDEX `notifications_created_at_idx` ON `notifications` (`created_at`);