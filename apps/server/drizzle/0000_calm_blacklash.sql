CREATE TABLE `users` (
	`id` varchar(191) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`username` varchar(100) NOT NULL,
	`avatar` varchar(500),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `table_migrations` (
	`table_name` varchar(191) NOT NULL,
	`current_version` int NOT NULL,
	`last_migrated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `table_migrations_table_name` PRIMARY KEY(`table_name`)
);
--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);