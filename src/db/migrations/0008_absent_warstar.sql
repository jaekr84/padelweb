CREATE TABLE `contact_messages` (
	`id` varchar(36) NOT NULL,
	`name` varchar(256) NOT NULL,
	`email` varchar(256) NOT NULL,
	`subject` varchar(256) NOT NULL,
	`message` text NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pendiente',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` varchar(36) NOT NULL,
	`user1_id` varchar(256) NOT NULL,
	`user2_id` varchar(256) NOT NULL,
	`last_message` text,
	`last_message_at` timestamp DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` varchar(36) NOT NULL,
	`conversation_id` varchar(36) NOT NULL,
	`sender_id` varchar(256) NOT NULL,
	`content` text NOT NULL,
	`is_read` boolean DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(256) NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sponsors` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`image_url` text NOT NULL,
	`link` text,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sponsors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `open_court_events` ADD `creator_id` varchar(256);--> statement-breakpoint
ALTER TABLE `posts` ADD `images` json;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `member_registration_fee` int;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `is_members_only` boolean DEFAULT false;--> statement-breakpoint
CREATE INDEX `conversations_user1_idx` ON `conversations` (`user1_id`);--> statement-breakpoint
CREATE INDEX `conversations_user2_idx` ON `conversations` (`user2_id`);--> statement-breakpoint
CREATE INDEX `messages_conversation_idx` ON `messages` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `messages_sender_idx` ON `messages` (`sender_id`);