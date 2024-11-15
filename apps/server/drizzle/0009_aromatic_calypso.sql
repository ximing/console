CREATE TABLE `yjs_documents` (
	`doc_name` varchar(255) NOT NULL,
	`data` text NOT NULL,
	`created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	`updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
	CONSTRAINT `yjs_documents_doc_name` PRIMARY KEY(`doc_name`)
);
