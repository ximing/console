CREATE TABLE `user_api_tokens` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`name` varchar(255) NOT NULL,
	`token` varchar(255) NOT NULL,
	`prefix` varchar(20) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`expires_at` timestamp(3),
	`last_used_at` timestamp(3),
	CONSTRAINT `user_api_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `user_api_tokens_user_id_idx` ON `user_api_tokens` (`user_id`);