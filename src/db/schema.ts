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
    documentNumber: varchar("document_number", { length: 50 }).unique(),
    birthDate: varchar("birth_date", { length: 50 }),
    gender: varchar("gender", { length: 20 }), // masculino | femenino
    bio: text("bio"),
    location: varchar("location", { length: 256 }),
    side: varchar("side", { length: 50 }), // drive | reves | ambos
    category: varchar("category", { length: 50 }).default("D"),
    points: int("points").default(0),
    clubId: varchar("club_id", { length: 256 }), // references added below in relations or manually
    isActive: boolean("is_active").default(true),
    bannedUntil: timestamp("banned_until"),
    imageUrl: varchar("image_url", { length: 512 }),
    lastParticipationAt: timestamp("last_participation_at"),
    lastCategoryUpdate: timestamp("last_category_update").defaultNow(),
    sessionVersion: int("session_version").default(0),
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
    time: varchar("time", { length: 50 }),
    location: varchar("location", { length: 256 }),
    categories: json("categories"), // MySQL uses JSON
    pointsConfig: json("points_config"),
    modalidad: json("modalidad"),
    openDateClub: varchar("open_date_club", { length: 50 }),
    openDateGeneral: varchar("open_date_general", { length: 50 }),
    status: varchar("status", { length: 50 }).notNull().default("draft"),
    type: varchar("type", { length: 50 }).notNull().default("round_robin"),
    imageUrl: varchar("image_url", { length: 512 }),
    youtubeUrl: varchar("youtube_url", { length: 512 }),
    registrationFee: int("registration_fee"),
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
    team1Id: varchar("team1_id", { length: 36 }),
    team2Id: varchar("team2_id", { length: 36 }),
    team1Name: varchar("team1_name", { length: 256 }).notNull(),
    team2Name: varchar("team2_name", { length: 256 }).notNull(),
    score1: smallint("score1"),
    score2: smallint("score2"),
    confirmed: boolean("confirmed").notNull().default(false),
    roundIndex: smallint("round_index"),
    courtNumber: smallint("court_number"),
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
    team1Id: varchar("team1_id", { length: 36 }),
    team2Id: varchar("team2_id", { length: 36 }),
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

export const postComments = mysqlTable("post_comments", {
    id: varchar("id", { length: 36 }).primaryKey(),
    postId: varchar("post_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 256 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    postIdIdx: index("post_comments_post_id_idx").on(table.postId),
    userIdIdx: index("post_comments_user_id_idx").on(table.userId),
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
    posts: many(posts),
    comments: many(postComments),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
    user: one(users, {
        fields: [posts.userId],
        references: [users.id],
    }),
    comments: many(postComments),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
    post: one(posts, {
        fields: [postComments.postId],
        references: [posts.id],
    }),
    user: one(users, {
        fields: [postComments.userId],
        references: [users.id],
    }),
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

export const clubRequests = mysqlTable("club_requests", {
    id: varchar("id", { length: 36 }).primaryKey(),
    clubId: varchar("club_id", { length: 256 }).notNull(),
    userId: varchar("user_id", { length: 256 }).notNull(),
    type: varchar("type", { length: 20 }).notNull(), // 'invitation' | 'application'
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
}, (table) => ({
    userIdIdx: index("club_requests_user_id_idx").on(table.userId),
    clubIdIdx: index("club_requests_club_id_idx").on(table.clubId),
}));

export const clubRequestsRelations = relations(clubRequests, ({ one }) => ({
    club: one(clubs, {
        fields: [clubRequests.clubId],
        references: [clubs.id],
    }),
    user: one(users, {
        fields: [clubRequests.userId],
        references: [users.id],
    }),
}));

export const systemSettings = mysqlTable("system_settings", {
    id: varchar("id", { length: 256 }).primaryKey(),
    key: varchar("key", { length: 256 }).notNull().unique(),
    value: text("value"),
    updatedAt: timestamp("updated_at").onUpdateNow(),
});

import { type InferSelectModel } from "drizzle-orm";
export type Club = InferSelectModel<typeof clubs>;
export type Category = InferSelectModel<typeof categoriesTable>;
export type User = InferSelectModel<typeof users>;
export type Tournament = InferSelectModel<typeof tournaments>;
export type Registration = InferSelectModel<typeof registrations>;
export type SystemSetting = InferSelectModel<typeof systemSettings>;

export const openCourtEvents = mysqlTable("open_court_events", {
    id: varchar("id", { length: 36 }).primaryKey(),
    clubId: varchar("club_id", { length: 256 }).notNull(),
    name: varchar("name", { length: 256 }).notNull(),
    date: varchar("date", { length: 255 }).notNull(),
    time: varchar("time", { length: 255 }).notNull(),
    address: varchar("address", { length: 255 }).notNull(),
    city: varchar("city", { length: 255 }).notNull(),
    registrationFee: int("registration_fee").notNull().default(0),
    totalSlots: int("total_slots").default(0),
    categories: json("categories"), // Array of category IDs or "libre"
    status: varchar("status", { length: 50 }).notNull().default("active"), // active | completed | cancelled
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    clubIdIdx: index("open_court_events_club_id_idx").on(table.clubId),
}));

export const openCourtRegistrations = mysqlTable("open_court_registrations", {
    id: varchar("id", { length: 36 }).primaryKey(),
    eventId: varchar("event_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 256 }).notNull(),
    sidePreference: varchar("side_preference", { length: 50 }), // drive | reves | ambos
    hasPaid: boolean("has_paid").notNull().default(false),
    status: varchar("status", { length: 50 }).notNull().default("waiting"), // waiting | playing | finished | absent
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    eventIdIdx: index("oc_reg_event_id_idx").on(table.eventId),
    userIdIdx: index("oc_reg_user_id_idx").on(table.userId),
}));

export const openCourtCourts = mysqlTable("open_court_courts", {
    id: varchar("id", { length: 36 }).primaryKey(),
    eventId: varchar("event_id", { length: 36 }).notNull(),
    courtNumber: int("court_number").notNull(),
    isActive: boolean("is_active").default(true),
    status: varchar("status", { length: 50 }).notNull().default("available"), // available | occupied
}, (table) => ({
    eventIdIdx: index("oc_courts_event_id_idx").on(table.eventId),
}));

export const openCourtMatches = mysqlTable("open_court_matches", {
    id: varchar("id", { length: 36 }).primaryKey(),
    eventId: varchar("event_id", { length: 36 }).notNull(),
    courtId: varchar("court_id", { length: 36 }),
    team1Player1Id: varchar("t1_p1_id", { length: 256 }).notNull(),
    team1Player2Id: varchar("t1_p2_id", { length: 256 }).notNull(),
    team2Player1Id: varchar("t2_p1_id", { length: 256 }).notNull(),
    team2Player2Id: varchar("t2_p2_id", { length: 256 }).notNull(),
    score1: smallint("score1"),
    score2: smallint("score2"),
    status: varchar("status", { length: 50 }).notNull().default("in_progress"), // in_progress | completed
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
}, (table) => ({
    eventIdIdx: index("oc_matches_event_id_idx").on(table.eventId),
}));

// Relations
export const openCourtEventsRelations = relations(openCourtEvents, ({ one, many }) => ({
    club: one(clubs, {
        fields: [openCourtEvents.clubId],
        references: [clubs.id],
    }),
    registrations: many(openCourtRegistrations),
    courts: many(openCourtCourts),
    matches: many(openCourtMatches),
}));

export const openCourtRegistrationsRelations = relations(openCourtRegistrations, ({ one }) => ({
    event: one(openCourtEvents, {
        fields: [openCourtRegistrations.eventId],
        references: [openCourtEvents.id],
    }),
    user: one(users, {
        fields: [openCourtRegistrations.userId],
        references: [users.id],
    }),
}));

export const openCourtMatchesRelations = relations(openCourtMatches, ({ one }) => ({
    event: one(openCourtEvents, {
        fields: [openCourtMatches.eventId],
        references: [openCourtEvents.id],
    }),
    t1p1: one(users, { fields: [openCourtMatches.team1Player1Id], references: [users.id] }),
    t1p2: one(users, { fields: [openCourtMatches.team1Player2Id], references: [users.id] }),
    t2p1: one(users, { fields: [openCourtMatches.team2Player1Id], references: [users.id] }),
    t2p2: one(users, { fields: [openCourtMatches.team2Player2Id], references: [users.id] }),
}));

export type OpenCourtEvent = InferSelectModel<typeof openCourtEvents>;
export type OpenCourtRegistration = InferSelectModel<typeof openCourtRegistrations>;
export type OpenCourtMatch = InferSelectModel<typeof openCourtMatches>;
export type OpenCourtCourt = InferSelectModel<typeof openCourtCourts>;

export const publicMatches = mysqlTable("public_matches", {
    id: varchar("id", { length: 36 }).primaryKey(),
    creatorId: varchar("creator_id", { length: 256 }).notNull(),
    date: varchar("date", { length: 255 }).notNull(),
    time: varchar("time", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }).notNull(),
    city: varchar("city", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }),
    gender: varchar("gender", { length: 50 }).default("mixto"),
    description: text("description"),
    totalSlots: int("total_slots").default(4),
    status: varchar("status", { length: 50 }).notNull().default("open"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    creatorIdIdx: index("public_matches_creator_id_idx").on(table.creatorId),
    cityIdx: index("public_matches_city_idx").on(table.city),
}));

export const publicMatchRegistrations = mysqlTable("public_match_registrations", {
    id: varchar("id", { length: 36 }).primaryKey(),
    matchId: varchar("match_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 256 }), // Nullable for guests
    guestName: varchar("guest_name", { length: 256 }), // Name for non-registered users
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    matchIdIdx: index("pm_reg_match_id_idx").on(table.matchId),
    userIdIdx: index("pm_reg_user_id_idx").on(table.userId),
}));

export const publicMatchesRelations = relations(publicMatches, ({ one, many }) => ({
    creator: one(users, {
        fields: [publicMatches.creatorId],
        references: [users.id],
    }),
    registrations: many(publicMatchRegistrations),
}));

export const publicMatchRegistrationsRelations = relations(publicMatchRegistrations, ({ one }) => ({
    match: one(publicMatches, {
        fields: [publicMatchRegistrations.matchId],
        references: [publicMatches.id],
    }),
    user: one(users, {
        fields: [publicMatchRegistrations.userId],
        references: [users.id],
    }),
}));

export type PublicMatch = InferSelectModel<typeof publicMatches>;
export type PublicMatchRegistration = InferSelectModel<typeof publicMatchRegistrations>;

// Sponsors Table
export const sponsors = mysqlTable("sponsors", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    imageUrl: text("image_url").notNull(),
    link: text("link"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Sponsor = InferSelectModel<typeof sponsors>;
