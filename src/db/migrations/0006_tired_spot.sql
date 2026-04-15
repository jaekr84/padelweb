CREATE TABLE `public_match_registrations` (
	`id` varchar(36) NOT NULL,
	`match_id` varchar(36) NOT NULL,
	`user_id` varchar(256) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `public_match_registrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `public_matches` (
	`id` varchar(36) NOT NULL,
	`creator_id` varchar(256) NOT NULL,
	`date` varchar(255) NOT NULL,
	`time` varchar(255) NOT NULL,
	`location` varchar(255) NOT NULL,
	`city` varchar(255) NOT NULL,
	`category` varchar(100),
	`gender` varchar(50) DEFAULT 'mixto',
	`description` text,
	`total_slots` int DEFAULT 4,
	`status` varchar(50) NOT NULL DEFAULT 'open',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `public_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `open_court_events` MODIFY COLUMN `date` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `open_court_events` MODIFY COLUMN `time` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `open_court_events` MODIFY COLUMN `registration_fee` int NOT NULL;--> statement-breakpoint
ALTER TABLE `open_court_matches` MODIFY COLUMN `started_at` timestamp;--> statement-breakpoint
ALTER TABLE `open_court_events` ADD `address` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `open_court_events` ADD `city` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `open_court_registrations` ADD `has_paid` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `time` varchar(50);--> statement-breakpoint
ALTER TABLE `tournaments` ADD `location` varchar(256);--> statement-breakpoint
CREATE INDEX `pm_reg_match_id_idx` ON `public_match_registrations` (`match_id`);--> statement-breakpoint
CREATE INDEX `pm_reg_user_id_idx` ON `public_match_registrations` (`user_id`);--> statement-breakpoint
CREATE INDEX `public_matches_creator_id_idx` ON `public_matches` (`creator_id`);--> statement-breakpoint
CREATE INDEX `public_matches_city_idx` ON `public_matches` (`city`);--> statement-breakpoint
ALTER TABLE `open_court_events` DROP COLUMN `location`;