ALTER TABLE `blogs` ADD `content_snapshot` text;--> statement-breakpoint
ALTER TABLE `blogs` ADD `last_snapshot_at` timestamp(3);