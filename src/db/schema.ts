import { pgTable, text, timestamp, varchar, json, uuid, boolean, integer, smallint } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: varchar("id", { length: 256 }).primaryKey(), // Clerk user ID
    email: varchar("email", { length: 256 }).notNull().unique(),
    role: varchar("role", { length: 50 }).notNull().default("jugador"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clubs = pgTable("clubs", {
    id: varchar("id", { length: 256 }).primaryKey(),
    ownerId: varchar("owner_id", { length: 256 }).references(() => users.id).notNull().unique(),
    name: varchar("name", { length: 256 }).notNull(),
    bio: text("bio"),
    location: varchar("location", { length: 256 }),
    phone: varchar("phone", { length: 50 }),
    website: varchar("website", { length: 256 }),
    amenities: text("amenities").array(),
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
    status: varchar("status", { length: 50 }).notNull().default("draft"), // draft | published
    imageUrl: varchar("image_url", { length: 512 }),
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

