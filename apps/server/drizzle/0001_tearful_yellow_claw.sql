CREATE TABLE `tasks` (
	`id` varchar(191) NOT NULL,
	`name` varchar(255) NOT NULL,
	`trigger_type` enum('manual','scheduled') NOT NULL DEFAULT 'manual',
	`cron_expression` varchar(100),
	`enabled` boolean NOT NULL DEFAULT true,
	`action_id` varchar(100) NOT NULL,
	`action_config` json,
	`created_by` varchar(191) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `execution_logs` (
	`id` varchar(191) NOT NULL,
	`task_id` varchar(191) NOT NULL,
	`status` enum('success','failed') NOT NULL DEFAULT 'failed',
	`started_at` timestamp(3) NOT NULL DEFAULT (now()),
	`finished_at` timestamp(3),
	`error_message` varchar(2000),
	`error_type` varchar(100),
	`result` json,
	CONSTRAINT `execution_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `execution_logs` ADD CONSTRAINT `execution_logs_task_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tasks_created_by_idx` ON `tasks` (`created_by`);--> statement-breakpoint
CREATE INDEX `tasks_enabled_idx` ON `tasks` (`enabled`);--> statement-breakpoint
CREATE INDEX `execution_logs_task_id_idx` ON `execution_logs` (`task_id`);--> statement-breakpoint
CREATE INDEX `execution_logs_started_at_idx` ON `execution_logs` (`started_at`);