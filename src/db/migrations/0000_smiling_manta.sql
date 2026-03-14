CREATE TABLE `bracket_matches` (
	`id` varchar(36) NOT NULL,
	`tournament_id` varchar(36) NOT NULL,
	`round` smallint NOT NULL,
	`slot` smallint NOT NULL,
	`team1_name` varchar(256),
	`team2_name` varchar(256),
	`score1` smallint,
	`score2` smallint,
	`confirmed` boolean NOT NULL DEFAULT false,
	`winner_id` varchar(256),
	`winner_name` varchar(256),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bracket_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` varchar(36) NOT NULL,
	`name` varchar(50) NOT NULL,
	`min_points` int NOT NULL DEFAULT 0,
	`max_points` int NOT NULL DEFAULT 10000,
	`gender` varchar(20) NOT NULL DEFAULT 'mixto',
	`category_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clubs` (
	`id` varchar(256) NOT NULL,
	`owner_id` varchar(256) NOT NULL,
	`name` varchar(256) NOT NULL,
	`type` varchar(50) NOT NULL DEFAULT 'club',
	`bio` text,
	`location` varchar(256),
	`address` varchar(512),
	`phone` varchar(50),
	`whatsapp` varchar(50),
	`instagram` varchar(100),
	`website` varchar(256),
	`amenities` json,
	`courts` int DEFAULT 0,
	`surfaces` json,
	`schedule` json,
	`photos` json,
	`verified` boolean DEFAULT false,
	`logo_url` varchar(512),
	`rating` varchar(10) DEFAULT '0.0',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clubs_id` PRIMARY KEY(`id`),
	CONSTRAINT `clubs_owner_id_unique` UNIQUE(`owner_id`)
);
--> statement-breakpoint
CREATE TABLE `group_matches` (
	`id` varchar(36) NOT NULL,
	`tournament_id` varchar(36) NOT NULL,
	`group_id` varchar(36) NOT NULL,
	`team1_name` varchar(256) NOT NULL,
	`team2_name` varchar(256) NOT NULL,
	`score1` smallint,
	`score2` smallint,
	`confirmed` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_items` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(256) NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`price` int NOT NULL,
	`images` json NOT NULL,
	`category` varchar(100),
	`condition` varchar(50),
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`whatsapp_url` text,
	`observations` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(256) NOT NULL,
	`content` text,
	`image_url` varchar(512),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registration_requests` (
	`id` varchar(36) NOT NULL,
	`full_name` varchar(256) NOT NULL,
	`whatsapp` varchar(50) NOT NULL,
	`status` varchar(20) NOT NULL DEFAULT 'pendiente',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `registration_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` varchar(36) NOT NULL,
	`tournament_id` varchar(36) NOT NULL,
	`user_id` varchar(256) NOT NULL,
	`category` varchar(100),
	`partner_name` varchar(256),
	`partner_user_id` varchar(256),
	`is_guest_partner` boolean DEFAULT false,
	`status` varchar(50) NOT NULL DEFAULT 'confirmed',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `registrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournament_groups` (
	`id` varchar(36) NOT NULL,
	`tournament_id` varchar(36) NOT NULL,
	`name` varchar(50) NOT NULL,
	`players` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tournament_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` varchar(36) NOT NULL,
	`created_by_user_id` varchar(256) NOT NULL,
	`club_id` varchar(256),
	`name` varchar(256) NOT NULL,
	`description` text,
	`surface` varchar(100),
	`start_date` varchar(50),
	`end_date` varchar(50),
	`categories` json,
	`points_config` json,
	`modalidad` json,
	`status` varchar(50) NOT NULL DEFAULT 'draft',
	`image_url` varchar(512),
	`youtube_url` varchar(512),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tournaments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(256) NOT NULL,
	`email` varchar(256) NOT NULL,
	`password_hash` text,
	`role` varchar(50) NOT NULL DEFAULT 'jugador',
	`first_name` varchar(256),
	`last_name` varchar(256),
	`phone` varchar(50),
	`document_number` varchar(50),
	`birth_date` varchar(50),
	`gender` varchar(20),
	`bio` text,
	`location` varchar(256),
	`side` varchar(50),
	`category` varchar(50) DEFAULT '5ta',
	`points` int DEFAULT 0,
	`club_id` varchar(256),
	`is_active` boolean DEFAULT true,
	`banned_until` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `bracket_matches_tournament_id_idx` ON `bracket_matches` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `clubs_owner_id_idx` ON `clubs` (`owner_id`);--> statement-breakpoint
CREATE INDEX `group_matches_tournament_id_idx` ON `group_matches` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `group_matches_group_id_idx` ON `group_matches` (`group_id`);--> statement-breakpoint
CREATE INDEX `marketplace_user_id_idx` ON `marketplace_items` (`user_id`);--> statement-breakpoint
CREATE INDEX `posts_user_id_idx` ON `posts` (`user_id`);--> statement-breakpoint
CREATE INDEX `registration_requests_whatsapp_idx` ON `registration_requests` (`whatsapp`);--> statement-breakpoint
CREATE INDEX `registrations_tournament_id_idx` ON `registrations` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `registrations_user_id_idx` ON `registrations` (`user_id`);--> statement-breakpoint
CREATE INDEX `groups_tournament_id_idx` ON `tournament_groups` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `tournaments_created_by_idx` ON `tournaments` (`created_by_user_id`);--> statement-breakpoint
CREATE INDEX `tournaments_club_id_idx` ON `tournaments` (`club_id`);--> statement-breakpoint
CREATE INDEX `users_club_id_idx` ON `users` (`club_id`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_document_idx` ON `users` (`document_number`);