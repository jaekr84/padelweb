ALTER TABLE `public_match_registrations` MODIFY COLUMN `user_id` varchar(256);--> statement-breakpoint
ALTER TABLE `public_match_registrations` ADD `guest_name` varchar(256);