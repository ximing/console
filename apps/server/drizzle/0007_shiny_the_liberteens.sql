CREATE TABLE `blog_media` (
	`id` varchar(24) NOT NULL,
	`blog_id` varchar(191) NOT NULL,
	`path` varchar(500) NOT NULL,
	`filename` varchar(255) NOT NULL,
	`size` int NOT NULL,
	`type` varchar(20) NOT NULL,
	`width` int,
	`height` int,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `blog_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `blog_media` ADD CONSTRAINT `blog_media_blog_id_blogs_id_fk` FOREIGN KEY (`blog_id`) REFERENCES `blogs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `blog_id_idx` ON `blog_media` (`blog_id`);--> statement-breakpoint
CREATE INDEX `path_idx` ON `blog_media` (`path`);