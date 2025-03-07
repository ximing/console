CREATE TABLE `insight_profiles` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`name` varchar(50) NOT NULL,
	`year_gan` varchar(4) NOT NULL DEFAULT '',
	`year_zhi` varchar(4) NOT NULL DEFAULT '',
	`month_gan` varchar(4) NOT NULL DEFAULT '',
	`month_zhi` varchar(4) NOT NULL DEFAULT '',
	`day_gan` varchar(4) NOT NULL DEFAULT '',
	`day_zhi` varchar(4) NOT NULL DEFAULT '',
	`hour_gan` varchar(4) NOT NULL DEFAULT '',
	`hour_zhi` varchar(4) NOT NULL DEFAULT '',
	`year_detail` json,
	`month_detail` json,
	`day_detail` json,
	`hour_detail` json,
	`shenshas` json,
	`birth_year` int NOT NULL DEFAULT 1990,
	`custom_aspects` json,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `insight_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insight_dayun` (
	`id` varchar(191) NOT NULL,
	`profile_id` varchar(191) NOT NULL,
	`gan` varchar(4) NOT NULL,
	`zhi` varchar(4) NOT NULL,
	`start_year` int NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `insight_dayun_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `insight_dayun` ADD CONSTRAINT `insight_dayun_profile_id_insight_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `insight_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `insight_profiles_user_id_idx` ON `insight_profiles` (`user_id`);--> statement-breakpoint
CREATE INDEX `insight_dayun_profile_id_idx` ON `insight_dayun` (`profile_id`);