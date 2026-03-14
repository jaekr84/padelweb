CREATE TABLE "bracket_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round" smallint NOT NULL,
	"slot" smallint NOT NULL,
	"team1_name" varchar(256),
	"team2_name" varchar(256),
	"score1" smallint,
	"score2" smallint,
	"confirmed" boolean DEFAULT false NOT NULL,
	"winner_id" varchar(256),
	"winner_name" varchar(256),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"min_points" integer DEFAULT 0 NOT NULL,
	"max_points" integer DEFAULT 10000 NOT NULL,
	"gender" varchar(20) DEFAULT 'mixto' NOT NULL,
	"category_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"owner_id" varchar(256) NOT NULL,
	"name" varchar(256) NOT NULL,
	"type" varchar(50) DEFAULT 'club' NOT NULL,
	"bio" text,
	"location" varchar(256),
	"address" varchar(512),
	"phone" varchar(50),
	"whatsapp" varchar(50),
	"instagram" varchar(100),
	"website" varchar(256),
	"amenities" text[],
	"courts" integer DEFAULT 0,
	"surfaces" text[],
	"schedule" json,
	"photos" text[],
	"verified" boolean DEFAULT false,
	"logo_url" varchar(512),
	"rating" varchar(10) DEFAULT '0.0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clubs_owner_id_unique" UNIQUE("owner_id")
);
--> statement-breakpoint
CREATE TABLE "group_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"team1_name" varchar(256) NOT NULL,
	"team2_name" varchar(256) NOT NULL,
	"score1" smallint,
	"score2" smallint,
	"confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instructor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"name" varchar(256) NOT NULL,
	"bio" text,
	"location" varchar(256),
	"level" varchar(100),
	"specialities" text[],
	"experience" varchar(100),
	"rating" varchar(10) DEFAULT '0.0',
	"verified" boolean DEFAULT false,
	"phone" varchar(50),
	"whatsapp" varchar(50),
	"instagram" varchar(100),
	"working_zones" text[],
	"availability" json,
	"pricing" json,
	"avatar_url" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "instructor_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "marketplace_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"title" varchar(256) NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"images" text[] NOT NULL,
	"category" varchar(100),
	"condition" varchar(50),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"whatsapp_url" text,
	"observations" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"content" text,
	"image_url" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(256) NOT NULL,
	"whatsapp" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"category" varchar(100),
	"partner_name" varchar(256),
	"partner_user_id" varchar(256),
	"is_guest_partner" boolean DEFAULT false,
	"status" varchar(50) DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"players" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" varchar(256) NOT NULL,
	"club_id" varchar(256),
	"name" varchar(256) NOT NULL,
	"description" text,
	"surface" varchar(100),
	"start_date" varchar(50),
	"end_date" varchar(50),
	"categories" text[],
	"points_config" json,
	"modalidad" json,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"image_url" varchar(512),
	"youtube_url" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"email" varchar(256) NOT NULL,
	"password_hash" text,
	"role" varchar(50) DEFAULT 'jugador' NOT NULL,
	"first_name" varchar(256),
	"last_name" varchar(256),
	"phone" varchar(50),
	"document_number" varchar(50),
	"birth_date" varchar(50),
	"gender" varchar(20),
	"bio" text,
	"location" varchar(256),
	"side" varchar(50),
	"category" varchar(50) DEFAULT '5ta',
	"points" integer DEFAULT 0,
	"club_id" varchar(256),
	"is_active" boolean DEFAULT true,
	"banned_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bracket_matches" ADD CONSTRAINT "bracket_matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_matches" ADD CONSTRAINT "group_matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_matches" ADD CONSTRAINT "group_matches_group_id_tournament_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."tournament_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instructor_profiles" ADD CONSTRAINT "instructor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_items" ADD CONSTRAINT "marketplace_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_partner_user_id_users_id_fk" FOREIGN KEY ("partner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_groups" ADD CONSTRAINT "tournament_groups_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bracket_matches_tournament_id_idx" ON "bracket_matches" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "clubs_owner_id_idx" ON "clubs" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "group_matches_tournament_id_idx" ON "group_matches" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "group_matches_group_id_idx" ON "group_matches" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "instructor_userId_idx" ON "instructor_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "marketplace_user_id_idx" ON "marketplace_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "posts_user_id_idx" ON "posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "registration_requests_whatsapp_idx" ON "registration_requests" USING btree ("whatsapp");--> statement-breakpoint
CREATE INDEX "registrations_tournament_id_idx" ON "registrations" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "registrations_user_id_idx" ON "registrations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "groups_tournament_id_idx" ON "tournament_groups" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "tournaments_created_by_idx" ON "tournaments" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "tournaments_club_id_idx" ON "tournaments" USING btree ("club_id");--> statement-breakpoint
CREATE INDEX "users_club_id_idx" ON "users" USING btree ("club_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_document_idx" ON "users" USING btree ("document_number");