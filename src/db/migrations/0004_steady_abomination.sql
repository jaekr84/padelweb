CREATE TABLE `post_comments` (
	`id` varchar(36) NOT NULL,
	`post_id` varchar(36) NOT NULL,
	`user_id` varchar(256) NOT NULL,
	`content` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `post_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `category` varchar(50) DEFAULT 'D';--> statement-breakpoint
ALTER TABLE `bracket_matches` ADD `team1_id` varchar(36);--> statement-breakpoint
ALTER TABLE `bracket_matches` ADD `team2_id` varchar(36);--> statement-breakpoint
ALTER TABLE `group_matches` ADD `team1_id` varchar(36);--> statement-breakpoint
ALTER TABLE `group_matches` ADD `team2_id` varchar(36);--> statement-breakpoint
ALTER TABLE `users` ADD `last_participation_at` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `last_category_update` timestamp DEFAULT (now());--> statement-breakpoint
CREATE INDEX `post_comments_post_id_idx` ON `post_comments` (`post_id`);--> statement-breakpoint
CREATE INDEX `post_comments_user_id_idx` ON `post_comments` (`user_id`);