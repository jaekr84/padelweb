ALTER TABLE `open_court_registrations` MODIFY COLUMN `user_id` varchar(256);--> statement-breakpoint
ALTER TABLE `messages` ADD `image_url` varchar(512);--> statement-breakpoint
ALTER TABLE `open_court_registrations` ADD `guest_name` varchar(256);