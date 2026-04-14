CREATE TABLE `club_requests` (
	`id` varchar(36) NOT NULL,
	`club_id` varchar(256) NOT NULL,
	`user_id` varchar(256) NOT NULL,
	`type` varchar(20) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `club_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `open_court_courts` (
	`id` varchar(36) NOT NULL,
	`event_id` varchar(36) NOT NULL,
	`court_number` int NOT NULL,
	`is_active` boolean DEFAULT true,
	`status` varchar(50) NOT NULL DEFAULT 'available',
	CONSTRAINT `open_court_courts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `open_court_events` (
	`id` varchar(36) NOT NULL,
	`club_id` varchar(256) NOT NULL,
	`name` varchar(256) NOT NULL,
	`date` varchar(50) NOT NULL,
	`time` varchar(50) NOT NULL,
	`location` varchar(256),
	`registration_fee` int DEFAULT 0,
	`total_slots` int DEFAULT 0,
	`categories` json,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `open_court_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `open_court_matches` (
	`id` varchar(36) NOT NULL,
	`event_id` varchar(36) NOT NULL,
	`court_id` varchar(36),
	`t1_p1_id` varchar(256) NOT NULL,
	`t1_p2_id` varchar(256) NOT NULL,
	`t2_p1_id` varchar(256) NOT NULL,
	`t2_p2_id` varchar(256) NOT NULL,
	`score1` smallint,
	`score2` smallint,
	`status` varchar(50) NOT NULL DEFAULT 'in_progress',
	`started_at` timestamp DEFAULT (now()),
	`finished_at` timestamp,
	CONSTRAINT `open_court_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `open_court_registrations` (
	`id` varchar(36) NOT NULL,
	`event_id` varchar(36) NOT NULL,
	`user_id` varchar(256) NOT NULL,
	`side_preference` varchar(50),
	`status` varchar(50) NOT NULL DEFAULT 'waiting',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `open_court_registrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` varchar(256) NOT NULL,
	`key` varchar(256) NOT NULL,
	`value` text,
	`updated_at` timestamp ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `group_matches` ADD `round_index` smallint;--> statement-breakpoint
ALTER TABLE `group_matches` ADD `court_number` smallint;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `type` varchar(50) DEFAULT 'round_robin' NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `registration_fee` int;--> statement-breakpoint
ALTER TABLE `users` ADD `session_version` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_document_number_unique` UNIQUE(`document_number`);--> statement-breakpoint
CREATE INDEX `club_requests_user_id_idx` ON `club_requests` (`user_id`);--> statement-breakpoint
CREATE INDEX `club_requests_club_id_idx` ON `club_requests` (`club_id`);--> statement-breakpoint
CREATE INDEX `oc_courts_event_id_idx` ON `open_court_courts` (`event_id`);--> statement-breakpoint
CREATE INDEX `open_court_events_club_id_idx` ON `open_court_events` (`club_id`);--> statement-breakpoint
CREATE INDEX `oc_matches_event_id_idx` ON `open_court_matches` (`event_id`);--> statement-breakpoint
CREATE INDEX `oc_reg_event_id_idx` ON `open_court_registrations` (`event_id`);--> statement-breakpoint
CREATE INDEX `oc_reg_user_id_idx` ON `open_court_registrations` (`user_id`);