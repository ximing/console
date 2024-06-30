CREATE TABLE `github_repos` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`name` varchar(255) NOT NULL,
	`full_name` varchar(255) NOT NULL,
	`pat` varchar(500) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `github_repos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `github_repos` ADD CONSTRAINT `github_repos_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `github_repos_user_id_idx` ON `github_repos` (`user_id`);