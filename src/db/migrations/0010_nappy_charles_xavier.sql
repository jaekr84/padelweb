ALTER TABLE `bracket_matches` ADD `status` varchar(50) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `group_matches` ADD `status` varchar(50) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `open_court_courts` ADD `match_type` varchar(50) DEFAULT 'libre';--> statement-breakpoint
ALTER TABLE `open_court_registrations` ADD `gender` varchar(20);