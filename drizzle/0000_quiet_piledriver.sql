CREATE TABLE `items_table` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`condition` varchar(255),
	`category` varchar(255),
	`manufactured_year` varchar(255),
	`description` varchar(255) NOT NULL,
	`photo1` varchar(255),
	`photo2` varchar(255),
	`photo3` varchar(255),
	`photo4` varchar(255),
	`bid_date` datetime,
	`user_id` int NOT NULL,
	CONSTRAINT `items_table_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users_table` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	CONSTRAINT `users_table_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_table_email_unique` UNIQUE(`email`)
);
