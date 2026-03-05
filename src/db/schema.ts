import { pgTable, text, timestamp, varchar, json, uuid, boolean, integer, smallint } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: varchar("id", { length: 256 }).primaryKey(), // Clerk user ID
    email: varchar("email", { length: 256 }).notNull().unique(),
    role: varchar("role", { length: 50 }).notNull().default("jugador"),
    name: varchar("name", { length: 256 }),
    bio: text("bio"),
    location: varchar("location", { length: 256 }),
    side: varchar("side", { length: 50 }), // drive | reves | ambos
    category: varchar("category", { length: 50 }).default("5ta"),
    points: integer("points").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clubs = pgTable("clubs", {
    id: varchar("id", { length: 256 }).primaryKey(),
    ownerId: varchar("owner_id", { length: 256 }).references(() => users.id).notNull().unique(),
    name: varchar("name", { length: 256 }).notNull(),
    type: varchar("type", { length: 50 }).notNull().default("club"), // club | centro
    bio: text("bio"),
    location: varchar("location", { length: 256 }),
    address: varchar("address", { length: 512 }),
    phone: varchar("phone", { length: 50 }),
    whatsapp: varchar("whatsapp", { length: 50 }),
    instagram: varchar("instagram", { length: 100 }),
    website: varchar("website", { length: 256 }),
    amenities: text("amenities").array(),
    courts: integer("courts").default(0),
    surfaces: text("surfaces").array(),
    schedule: json("schedule"),
    photos: text("photos").array(),
    verified: boolean("verified").default(false),
    logoUrl: varchar("logo_url", { length: 512 }),
    rating: varchar("rating", { length: 10 }).default("0.0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const instructorProfiles = pgTable("instructor_profiles", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 256 }).references(() => users.id).notNull().unique(),
    name: varchar("name", { length: 256 }).notNull(),
    bio: text("bio"),
    location: varchar("location", { length: 256 }),
    level: varchar("level", { length: 100 }),
    specialities: text("specialities").array(),
    experience: varchar("experience", { length: 100 }),
    rating: varchar("rating", { length: 10 }).default("0.0"),
    verified: boolean("verified").default(false),
    phone: varchar("phone", { length: 50 }),
    whatsapp: varchar("whatsapp", { length: 50 }),
    instagram: varchar("instagram", { length: 100 }),
    workingZones: text("working_zones").array(),
    availability: json("availability"),
    pricing: json("pricing"),
    avatarUrl: varchar("avatar_url", { length: 512 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournaments = pgTable("tournaments", {
    id: uuid("id").defaultRandom().primaryKey(),
    createdByUserId: varchar("created_by_user_id", { length: 256 }).references(() => users.id).notNull(),
    clubId: varchar("club_id", { length: 256 }).references(() => clubs.id),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    surface: varchar("surface", { length: 100 }),
    startDate: varchar("start_date", { length: 50 }),
    endDate: varchar("end_date", { length: 50 }),
    categories: text("categories").array(),       // e.g. ["3ra", "4ta", "5ta"]
    pointsConfig: json("points_config"),           // { winner: 1000, finalist: 600, ... }
    modalidad: json("modalidad"),                  // { mode, participacion, genero, tipoTorneo }
    status: varchar("status", { length: 50 }).notNull().default("draft"), // draft | published | en_curso | en_eliminatorias | finalizado
    imageUrl: varchar("image_url", { length: 512 }),
    youtubeUrl: varchar("youtube_url", { length: 512 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const registrations = pgTable("registrations", {
    id: uuid("id").defaultRandom().primaryKey(),
    tournamentId: uuid("tournament_id").references(() => tournaments.id).notNull(),
    userId: varchar("user_id", { length: 256 }).references(() => users.id).notNull(),
    category: varchar("category", { length: 100 }),          // null if libre
    partnerName: varchar("partner_name", { length: 256 }),   // name of partner (platform user or guest)
    partnerUserId: varchar("partner_user_id", { length: 256 }).references(() => users.id), // null if guest
    isGuestPartner: boolean("is_guest_partner").default(false),
    status: varchar("status", { length: 50 }).notNull().default("confirmed"), // confirmed | cancelled
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── New: Fixture Results ──────────────────────────────────────────────────────

export const tournamentGroups = pgTable("tournament_groups", {
    id: uuid("id").defaultRandom().primaryKey(),
    tournamentId: uuid("tournament_id").references(() => tournaments.id).notNull(),
    name: varchar("name", { length: 50 }).notNull(),              // "Grupo A"
    players: json("players").notNull(),                           // Player[] JSON
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupMatches = pgTable("group_matches", {
    id: uuid("id").defaultRandom().primaryKey(),
    tournamentId: uuid("tournament_id").references(() => tournaments.id).notNull(),
    groupId: uuid("group_id").references(() => tournamentGroups.id).notNull(),
    team1Name: varchar("team1_name", { length: 256 }).notNull(),
    team2Name: varchar("team2_name", { length: 256 }).notNull(),
    score1: smallint("score1"),
    score2: smallint("score2"),
    confirmed: boolean("confirmed").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bracketMatches = pgTable("bracket_matches", {
    id: uuid("id").defaultRandom().primaryKey(),
    tournamentId: uuid("tournament_id").references(() => tournaments.id).notNull(),
    round: smallint("round").notNull(),
    slot: smallint("slot").notNull(),
    team1Name: varchar("team1_name", { length: 256 }),
    team2Name: varchar("team2_name", { length: 256 }),
    score1: smallint("score1"),
    score2: smallint("score2"),
    confirmed: boolean("confirmed").notNull().default(false),
    winnerId: varchar("winner_id", { length: 256 }),
    winnerName: varchar("winner_name", { length: 256 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Feed / Posts ──────────────────────────────────────────────────────────────
export const posts = pgTable("posts", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 256 }).references(() => users.id).notNull(),
    content: text("content"),
    imageUrl: varchar("image_url", { length: 512 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

import { relations } from "drizzle-orm";

export const tournamentsRelations = relations(tournaments, ({ one }) => ({
    club: one(clubs, {
        fields: [tournaments.clubId],
        references: [clubs.id],
    }),
    createdBy: one(users, {
        fields: [tournaments.createdByUserId],
        references: [users.id],
    }),
}));

export const usersRelations = relations(users, ({ many }) => ({
    tournaments: many(tournaments),
    clubs: many(clubs),
}));

export const clubsRelations = relations(clubs, ({ one, many }) => ({
    owner: one(users, {
        fields: [clubs.ownerId],
        references: [users.id],
    }),
    tournaments: many(tournaments),
}));

