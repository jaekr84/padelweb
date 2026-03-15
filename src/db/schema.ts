import { mysqlTable, text, timestamp, varchar, json, boolean, int, smallint, index, datetime } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable("users", {
    id: varchar("id", { length: 256 }).primaryKey(),
    email: varchar("email", { length: 256 }).notNull().unique(),
    passwordHash: text("password_hash"),
    role: varchar("role", { length: 50 }).notNull().default("jugador"),
    firstName: varchar("first_name", { length: 256 }),
    lastName: varchar("last_name", { length: 256 }),
    phone: varchar("phone", { length: 50 }),
    documentNumber: varchar("document_number", { length: 50 }),
    birthDate: varchar("birth_date", { length: 50 }),
    gender: varchar("gender", { length: 20 }), // masculino | femenino
    bio: text("bio"),
    location: varchar("location", { length: 256 }),
    side: varchar("side", { length: 50 }), // drive | reves | ambos
    category: varchar("category", { length: 50 }).default("5ta"),
    points: int("points").default(0),
    clubId: varchar("club_id", { length: 256 }), // references added below in relations or manually
    isActive: boolean("is_active").default(true),
    bannedUntil: timestamp("banned_until"),
    imageUrl: varchar("image_url", { length: 512 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    clubIdIdx: index("users_club_id_idx").on(table.clubId),
    emailIdx: index("users_email_idx").on(table.email),
    documentIdx: index("users_document_idx").on(table.documentNumber),
}));

export const clubs = mysqlTable("clubs", {
    id: varchar("id", { length: 256 }).primaryKey(),
    ownerId: varchar("owner_id", { length: 256 }).notNull().unique(),
    name: varchar("name", { length: 256 }).notNull(),
    type: varchar("type", { length: 50 }).notNull().default("club"), // club | centro
    bio: text("bio"),
    location: varchar("location", { length: 256 }),
    address: varchar("address", { length: 512 }),
    phone: varchar("phone", { length: 50 }),
    whatsapp: varchar("whatsapp", { length: 50 }),
    instagram: varchar("instagram", { length: 100 }),
    website: varchar("website", { length: 256 }),
    amenities: json("amenities"), // MySQL uses JSON instead of array
    courts: int("courts").default(0),
    surfaces: json("surfaces"), // MySQL uses JSON instead of array
    schedule: json("schedule"),
    photos: json("photos"), // MySQL uses JSON instead of array
    verified: boolean("verified").default(false),
    logoUrl: varchar("logo_url", { length: 512 }),
    rating: varchar("rating", { length: 10 }).default("0.0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    ownerIdIdx: index("clubs_owner_id_idx").on(table.ownerId),
}));

export const tournaments = mysqlTable("tournaments", {
    id: varchar("id", { length: 36 }).primaryKey(), // Using varchar for UUID
    createdByUserId: varchar("created_by_user_id", { length: 256 }).notNull(),
    clubId: varchar("club_id", { length: 256 }),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    surface: varchar("surface", { length: 100 }),
    startDate: varchar("start_date", { length: 50 }),
    endDate: varchar("end_date", { length: 50 }),
    categories: json("categories"), // MySQL uses JSON
    pointsConfig: json("points_config"),
    modalidad: json("modalidad"),
    status: varchar("status", { length: 50 }).notNull().default("draft"),
    imageUrl: varchar("image_url", { length: 512 }),
    youtubeUrl: varchar("youtube_url", { length: 512 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    createdByIdx: index("tournaments_created_by_idx").on(table.createdByUserId),
    clubIdIdx: index("tournaments_club_id_idx").on(table.clubId),
}));

export const registrations = mysqlTable("registrations", {
    id: varchar("id", { length: 36 }).primaryKey(),
    tournamentId: varchar("tournament_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 256 }).notNull(),
    category: varchar("category", { length: 100 }),
    partnerName: varchar("partner_name", { length: 256 }),
    partnerUserId: varchar("partner_user_id", { length: 256 }),
    isGuestPartner: boolean("is_guest_partner").default(false),
    status: varchar("status", { length: 50 }).notNull().default("confirmed"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    tournamentIdIdx: index("registrations_tournament_id_idx").on(table.tournamentId),
    userIdIdx: index("registrations_user_id_idx").on(table.userId),
}));

export const tournamentGroups = mysqlTable("tournament_groups", {
    id: varchar("id", { length: 36 }).primaryKey(),
    tournamentId: varchar("tournament_id", { length: 36 }).notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    players: json("players").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    tournamentIdIdx: index("groups_tournament_id_idx").on(table.tournamentId),
}));

export const groupMatches = mysqlTable("group_matches", {
    id: varchar("id", { length: 36 }).primaryKey(),
    tournamentId: varchar("tournament_id", { length: 36 }).notNull(),
    groupId: varchar("group_id", { length: 36 }).notNull(),
    team1Name: varchar("team1_name", { length: 256 }).notNull(),
    team2Name: varchar("team2_name", { length: 256 }).notNull(),
    score1: smallint("score1"),
    score2: smallint("score2"),
    confirmed: boolean("confirmed").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    tournamentIdIdx: index("group_matches_tournament_id_idx").on(table.tournamentId),
    groupIdIdx: index("group_matches_group_id_idx").on(table.groupId),
}));

export const bracketMatches = mysqlTable("bracket_matches", {
    id: varchar("id", { length: 36 }).primaryKey(),
    tournamentId: varchar("tournament_id", { length: 36 }).notNull(),
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
}, (table) => ({
    tournamentIdIdx: index("bracket_matches_tournament_id_idx").on(table.tournamentId),
}));

export const posts = mysqlTable("posts", {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 256 }).notNull(),
    content: text("content"),
    imageUrl: varchar("image_url", { length: 512 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index("posts_user_id_idx").on(table.userId),
}));

export const marketplaceItems = mysqlTable("marketplace_items", {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 256 }).notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    description: text("description"),
    price: int("price").notNull(),
    images: json("images").notNull(), // MySQL JSON
    category: varchar("category", { length: 100 }),
    condition: varchar("condition", { length: 50 }),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    whatsappUrl: text("whatsapp_url"),
    observations: text("observations"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
}, (table) => ({
    userIdIdx: index("marketplace_user_id_idx").on(table.userId),
}));

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
    marketplaceItems: many(marketplaceItems),
}));

export const marketplaceItemsRelations = relations(marketplaceItems, ({ one }) => ({
    user: one(users, {
        fields: [marketplaceItems.userId],
        references: [users.id],
    }),
}));

export const clubsRelations = relations(clubs, ({ one, many }) => ({
    owner: one(users, {
        fields: [clubs.ownerId],
        references: [users.id],
    }),
    tournaments: many(tournaments),
}));

export const categoriesTable = mysqlTable("categories", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 50 }).notNull(),
    minPoints: int("min_points").notNull().default(0),
    maxPoints: int("max_points").notNull().default(10000),
    categoryOrder: int("category_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const registrationRequests = mysqlTable("registration_requests", {
    id: varchar("id", { length: 36 }).primaryKey(),
    fullName: varchar("full_name", { length: 256 }).notNull(),
    whatsapp: varchar("whatsapp", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pendiente"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    whatsappIdx: index("registration_requests_whatsapp_idx").on(table.whatsapp),
}));

import { type InferSelectModel } from "drizzle-orm";
export type Club = InferSelectModel<typeof clubs>;
export type Category = InferSelectModel<typeof categoriesTable>;
export type User = InferSelectModel<typeof users>;
export type Tournament = InferSelectModel<typeof tournaments>;
export type Registration = InferSelectModel<typeof registrations>;
