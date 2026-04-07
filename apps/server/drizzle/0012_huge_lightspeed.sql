CREATE TABLE `apps` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `apps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `app_versions` (
	`id` varchar(191) NOT NULL,
	`app_id` varchar(191) NOT NULL,
	`version` varchar(50) NOT NULL,
	`build_number` varchar(50),
	`changelog` text,
	`android_url` varchar(500),
	`ios_url` varchar(500),
	`is_latest` boolean NOT NULL DEFAULT false,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `app_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `yjs_documents` MODIFY COLUMN `data` LONGBLOB NOT NULL;--> statement-breakpoint
ALTER TABLE `apps` ADD CONSTRAINT `apps_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `app_versions` ADD CONSTRAINT `app_versions_app_id_apps_id_fk` FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `apps` (`user_id`);--> statement-breakpoint
CREATE INDEX `app_id_idx` ON `app_versions` (`app_id`);