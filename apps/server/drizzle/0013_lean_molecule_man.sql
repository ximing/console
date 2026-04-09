CREATE TABLE `github_settings` (
	`id` varchar(32) NOT NULL,
	`user_id` varchar(32) NOT NULL,
	`encrypted_pat` text NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `github_settings_id` PRIMARY KEY(`id`)
);
