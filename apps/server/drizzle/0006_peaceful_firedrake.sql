CREATE TABLE `blogs` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` json,
	`excerpt` text,
	`slug` varchar(100) NOT NULL,
	`directory_id` varchar(191),
	`status` varchar(20) NOT NULL DEFAULT 'draft',
	`published_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `blogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `directories` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`name` varchar(100) NOT NULL,
	`parent_id` varchar(191),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `directories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`name` varchar(50) NOT NULL,
	`color` varchar(7) NOT NULL DEFAULT '#3B82F6',
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_tags` (
	`blog_id` varchar(191) NOT NULL,
	`tag_id` varchar(191) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `blogs` ADD CONSTRAINT `blogs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blogs` ADD CONSTRAINT `blogs_directory_id_directories_id_fk` FOREIGN KEY (`directory_id`) REFERENCES `directories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `directories` ADD CONSTRAINT `directories_parent_id_directories_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `directories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_tags` ADD CONSTRAINT `blog_tags_blog_id_blogs_id_fk` FOREIGN KEY (`blog_id`) REFERENCES `blogs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `blog_tags` ADD CONSTRAINT `blog_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `blogs` (`user_id`);--> statement-breakpoint
CREATE INDEX `slug_idx` ON `blogs` (`slug`);--> statement-breakpoint
CREATE INDEX `directory_id_idx` ON `blogs` (`directory_id`);--> statement-breakpoint
CREATE INDEX `user_slug_idx` ON `blogs` (`user_id`,`slug`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `directories` (`user_id`);--> statement-breakpoint
CREATE INDEX `parent_id_idx` ON `directories` (`parent_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `tags` (`user_id`);--> statement-breakpoint
CREATE INDEX `blog_id_idx` ON `blog_tags` (`blog_id`);--> statement-breakpoint
CREATE INDEX `tag_id_idx` ON `blog_tags` (`tag_id`);--> statement-breakpoint
CREATE INDEX `pk` ON `blog_tags` (`blog_id`,`tag_id`);