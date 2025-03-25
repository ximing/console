CREATE TABLE `blog_visitors` (
	`id` varchar(32) NOT NULL,
	`github_id` varchar(32) NOT NULL,
	`login` varchar(191) NOT NULL,
	`name` varchar(191),
	`avatar_url` varchar(512),
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`last_login_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `blog_visitors_id` PRIMARY KEY(`id`),
	CONSTRAINT `blog_visitors_github_id_unique` UNIQUE(`github_id`)
);
--> statement-breakpoint
CREATE TABLE `blog_comments` (
	`id` varchar(32) NOT NULL,
	`post_path` varchar(191) NOT NULL,
	`visitor_id` varchar(32) NOT NULL,
	`parent_id` varchar(32),
	`content` text NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'visible',
	`like_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `blog_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `blog_likes` (
	`id` varchar(32) NOT NULL,
	`target_type` varchar(16) NOT NULL,
	`target_id` varchar(191) NOT NULL,
	`visitor_id` varchar(32),
	`anon_key` varchar(64),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `blog_likes_id` PRIMARY KEY(`id`),
	CONSTRAINT `visitor_like_idx` UNIQUE(`target_type`,`target_id`,`visitor_id`),
	CONSTRAINT `anon_like_idx` UNIQUE(`target_type`,`target_id`,`anon_key`)
);
--> statement-breakpoint
CREATE TABLE `blog_post_stats` (
	`post_path` varchar(191) NOT NULL,
	`view_count` int NOT NULL DEFAULT 0,
	`like_count` int NOT NULL DEFAULT 0,
	`comment_count` int NOT NULL DEFAULT 0,
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `blog_post_stats_post_path` PRIMARY KEY(`post_path`)
);
--> statement-breakpoint
CREATE INDEX `login_idx` ON `blog_visitors` (`login`);--> statement-breakpoint
CREATE INDEX `post_path_idx` ON `blog_comments` (`post_path`);--> statement-breakpoint
CREATE INDEX `visitor_id_idx` ON `blog_comments` (`visitor_id`);