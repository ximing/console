ALTER TABLE `yjs_documents` ADD COLUMN `data_new` LONGBLOB;--> statement-breakpoint
UPDATE `yjs_documents` SET `data_new` = `data`;--> statement-breakpoint
ALTER TABLE `yjs_documents` DROP COLUMN `data`;--> statement-breakpoint
ALTER TABLE `yjs_documents` CHANGE COLUMN `data_new` `data` LONGBLOB NOT NULL;
