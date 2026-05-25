CREATE TABLE `tokens_table` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`token` varchar(255) NOT NULL,
	`user_id` int NOT NULL,
	CONSTRAINT `tokens_table_id` PRIMARY KEY(`id`)
);
