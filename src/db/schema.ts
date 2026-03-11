import { pgTable, text, timestamp, varchar, json, uuid, boolean, integer, smallint, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: varchar("id", { length: 256 }).primaryKey(), // We'll transition this to be the email or a UUID
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
    points: integer("points").default(0),
    clubId: varchar("club_id", { length: 256 }).references((): any => clubs.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    clubIdIdx: index("users_club_id_idx").on(table.clubId),
    emailIdx: index("users_email_idx").on(table.email),
    documentIdx: index("users_document_idx").on(table.documentNumber),
}));

export const clubs = pgTable("clubs", {
    id: varchar("id", { length: 256 }).primaryKey(),
    ownerId: varchar("owner_id", { length: 256 }).references((): any => users.id).notNull().unique(),
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
}, (table) => ({
    ownerIdIdx: index("clubs_owner_id_idx").on(table.ownerId),
}));

export const instructorProfiles = pgTable("instructor_profiles", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 256 }).references((): any => users.id).notNull().unique(),
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
}, (table) => ({
    userIdIdx: index("instructor_userId_idx").on(table.userId),
}));

export const tournaments = pgTable("tournaments", {
    id: uuid("id").defaultRandom().primaryKey(),
    createdByUserId: varchar("created_by_user_id", { length: 256 }).references((): any => users.id).notNull(),
    clubId: varchar("club_id", { length: 256 }).references((): any => clubs.id),
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
}, (table) => ({
    createdByIdx: index("tournaments_created_by_idx").on(table.createdByUserId),
    clubIdIdx: index("tournaments_club_id_idx").on(table.clubId),
}));

export const registrations = pgTable("registrations", {
    id: uuid("id").defaultRandom().primaryKey(),
    tournamentId: uuid("tournament_id").references((): any => tournaments.id).notNull(),
    userId: varchar("user_id", { length: 256 }).references((): any => users.id).notNull(),
    category: varchar("category", { length: 100 }),          // null if libre
    partnerName: varchar("partner_name", { length: 256 }),   // name of partner (platform user or guest)
    partnerUserId: varchar("partner_user_id", { length: 256 }).references((): any => users.id), // null if guest
    isGuestPartner: boolean("is_guest_partner").default(false),
    status: varchar("status", { length: 50 }).notNull().default("confirmed"), // confirmed | cancelled
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    tournamentIdIdx: index("registrations_tournament_id_idx").on(table.tournamentId),
    userIdIdx: index("registrations_user_id_idx").on(table.userId),
}));

// ── New: Fixture Results ──────────────────────────────────────────────────────

export const tournamentGroups = pgTable("tournament_groups", {
    id: uuid("id").defaultRandom().primaryKey(),
    tournamentId: uuid("tournament_id").references((): any => tournaments.id).notNull(),
    name: varchar("name", { length: 50 }).notNull(),              // "Grupo A"
    players: json("players").notNull(),                           // Player[] JSON
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    tournamentIdIdx: index("groups_tournament_id_idx").on(table.tournamentId),
}));

export const groupMatches = pgTable("group_matches", {
    id: uuid("id").defaultRandom().primaryKey(),
    tournamentId: uuid("tournament_id").references((): any => tournaments.id).notNull(),
    groupId: uuid("group_id").references((): any => tournamentGroups.id).notNull(),
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

export const bracketMatches = pgTable("bracket_matches", {
    id: uuid("id").defaultRandom().primaryKey(),
    tournamentId: uuid("tournament_id").references((): any => tournaments.id).notNull(),
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

// ── Feed / Posts ──────────────────────────────────────────────────────────────
export const posts = pgTable("posts", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 256 }).references((): any => users.id).notNull(),
    content: text("content"),
    imageUrl: varchar("image_url", { length: 512 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index("posts_user_id_idx").on(table.userId),
}));

export const marketplaceItems = pgTable("marketplace_items", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 256 }).references((): any => users.id).notNull(),
    title: varchar("title", { length: 256 }).notNull(),
    description: text("description"),
    price: integer("price").notNull(),
    images: text("images").array().notNull(), // Array of image URLs
    category: varchar("category", { length: 100 }), // racket, shoes, clothes, etc.
    condition: varchar("condition", { length: 50 }), // new, used, like_new
    status: varchar("status", { length: 50 }).notNull().default("active"), // active, sold, inactive
    whatsappUrl: text("whatsapp_url"),
    observations: text("observations"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export const categoriesTable = pgTable("categories", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 50 }).notNull(),
    minPoints: integer("min_points").notNull().default(0),
    maxPoints: integer("max_points").notNull().default(10000),
    gender: varchar("gender", { length: 20 }).notNull().default("mixto"), // "hombre", "mujer", "mixto"
    categoryOrder: integer("category_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const registrationRequests = pgTable("registration_requests", {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: varchar("full_name", { length: 256 }).notNull(),
    whatsapp: varchar("whatsapp", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pendiente"), // pendiente | enviado | aceptado | rechazado | caducado
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    whatsappIdx: index("registration_requests_whatsapp_idx").on(table.whatsapp),
}));

import { type InferSelectModel } from "drizzle-orm";
export type Club = InferSelectModel<typeof clubs>;
export type Category = InferSelectModel<typeof categoriesTable>;

