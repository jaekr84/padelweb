import { mysqlTable, text, timestamp, varchar, json, boolean, int, smallint, index, uniqueIndex, datetime, primaryKey } from "drizzle-orm/mysql-core";
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
    // Jugador cargado a mano por un admin para que pueda jugar un desafío sin
    // tener cuenta. Es una fila de `users` de verdad — así el historial y los
    // puntos son suyos desde el día uno y el alta posterior no migra nada —,
    // pero no puede loguearse (no tiene passwordHash) y queda fuera de los
    // listados generales de la app. Ver src/app/(main)/desafio/actions/invitados.ts.
    isGuest: boolean("is_guest").default(false),
    approvalStatus: varchar("approval_status", { length: 20 }).notNull().default("approved"), // approved | pending
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
    memberRegistrationFee: int("member_registration_fee"),
    isMembersOnly: boolean("is_members_only").default(false),
    presentPlayerIds: json("present_player_ids"),
    paidPlayerIds: json("paid_player_ids"),
    hasPoints: boolean("has_points").default(true),
    finalizedAt: timestamp("finalized_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
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
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    roundIndex: smallint("round_index"),
    courtNumber: smallint("court_number"),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
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
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    winnerId: varchar("winner_id", { length: 256 }),
    winnerName: varchar("winner_name", { length: 256 }),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    tournamentIdIdx: index("bracket_matches_tournament_id_idx").on(table.tournamentId),
}));

export const posts = mysqlTable("posts", {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 256 }).notNull(),
    content: text("content"),
    imageUrl: varchar("image_url", { length: 512 }),
    images: json("images"), // Added for multi-photo support
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
    creatorId: varchar("creator_id", { length: 256 }), // Reference to the user who created the event
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    clubIdIdx: index("open_court_events_club_id_idx").on(table.clubId),
}));

export const openCourtRegistrations = mysqlTable("open_court_registrations", {
    id: varchar("id", { length: 36 }).primaryKey(),
    eventId: varchar("event_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 256 }), // Nullable for guests
    guestName: varchar("guest_name", { length: 256 }), // Name for non-registered users
    gender: varchar("gender", { length: 20 }), // masculino | femenino
    sidePreference: varchar("side_preference", { length: 50 }), // drive | reves | ambos
    hasPaid: boolean("has_paid").notNull().default(false),
    status: varchar("status", { length: 50 }).notNull().default("waiting"), // waiting | playing | finished | absent
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    eventIdIdx: index("oc_reg_event_id_idx").on(table.eventId),
    userIdIdx: index("oc_reg_user_id_idx").on(table.userId),
    // Prevents the same user from registering twice in the same event.
    // NULL userId (guests) are exempt — MySQL treats NULL != NULL in unique indexes.
    eventUserUniq: uniqueIndex("oc_reg_event_user_uniq").on(table.eventId, table.userId),
}));

export const openCourtCourts = mysqlTable("open_court_courts", {
    id: varchar("id", { length: 36 }).primaryKey(),
    eventId: varchar("event_id", { length: 36 }).notNull(),
    courtNumber: int("court_number").notNull(),
    isActive: boolean("is_active").default(true),
    matchType: varchar("match_type", { length: 50 }).default("libre"), // libre | mixto | mismo_genero
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
    creator: one(users, {
        fields: [openCourtEvents.creatorId],
        references: [users.id],
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

// ── Messaging System ─────────────────────────────────────────────────────────
export const conversations = mysqlTable("conversations", {
    id: varchar("id", { length: 36 }).primaryKey(),
    user1Id: varchar("user1_id", { length: 256 }).notNull(),
    user2Id: varchar("user2_id", { length: 256 }).notNull(),
    lastMessage: text("last_message"),
    lastMessageAt: timestamp("last_message_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    user1Idx: index("conversations_user1_idx").on(table.user1Id),
    user2Idx: index("conversations_user2_idx").on(table.user2Id),
}));

export const messages = mysqlTable("messages", {
    id: varchar("id", { length: 36 }).primaryKey(),
    conversationId: varchar("conversation_id", { length: 36 }).notNull(),
    senderId: varchar("sender_id", { length: 256 }).notNull(),
    content: text("content").notNull(),
    isRead: boolean("is_read").default(false),
    imageUrl: varchar("image_url", { length: 512 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    conversationIdx: index("messages_conversation_idx").on(table.conversationId),
    senderIdx: index("messages_sender_idx").on(table.senderId),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
    user1: one(users, { fields: [conversations.user1Id], references: [users.id] }),
    user2: one(users, { fields: [conversations.user2Id], references: [users.id] }),
    messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
    conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
    sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export type Conversation = InferSelectModel<typeof conversations>;
export type Message = InferSelectModel<typeof messages>;

// ── Push Subscriptions ──────────────────────────────────────────────────────

export const pushSubscriptions = mysqlTable("push_subscriptions", {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 256 }).notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
    user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}));

export const contactMessages = mysqlTable("contact_messages", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    email: varchar("email", { length: 256 }).notNull(),
    subject: varchar("subject", { length: 256 }).notNull(),
    message: text("message").notNull(),
    status: varchar("status", { length: 50 }).notNull().default("pendiente"), // pendiente | leido
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ContactMessage = InferSelectModel<typeof contactMessages>;

// Invitaciones de un solo uso. El link lleva un JWT firmado cuyo `jti` apunta
// a una fila de esta tabla: la firma sola no basta, la invitación tiene que
// existir, no estar usada ni revocada y no haber vencido. Así el link deja de
// servir apenas se completa el registro (o a las 24hs, lo que pase primero).
export const invitations = mysqlTable("invitations", {
    id: varchar("id", { length: 36 }).primaryKey(), // = jti del token
    role: varchar("role", { length: 50 }).notNull(),
    clubId: varchar("club_id", { length: 256 }),
    email: varchar("email", { length: 256 }), // opcional: invitación dirigida a ese correo
    label: varchar("label", { length: 256 }), // opcional: nota para recordar a quién se envió
    createdBy: varchar("created_by", { length: 256 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    usedByUserId: varchar("used_by_user_id", { length: 256 }),
    // Activación de un invitado del Desafío: en vez de crear una cuenta nueva,
    // el link activa esta cuenta que ya existe (y ya tiene historial jugado).
    targetUserId: varchar("target_user_id", { length: 256 }),
    revokedAt: timestamp("revoked_at"),
}, (table) => ({
    createdByIdx: index("invitations_created_by_idx").on(table.createdBy),
    expiresAtIdx: index("invitations_expires_at_idx").on(table.expiresAt),
}));

export type Invitation = InferSelectModel<typeof invitations>;

// ── Módulo Desafío ──────────────────────────────────────────────────────────
// Spec completa en docs/desafio-specs.md.
//
// Un desafío es un evento de duración abierta atado a una categoría. Los
// jugadores se inscriben, arman y desarman parejas libremente, y juegan en las
// canchas disponibles. Los puntos se acreditan SIEMPRE al jugador individual:
// la pareja es un vínculo temporal, el punto ya confirmado es de la persona.
//
// El módulo no comparte tablas con torneos ni con cancha abierta: se probó
// reutilizar `tournaments` y la divergencia terminó ensuciando el Americano.
//
// Nombres en inglés como el resto del schema; los estados van en castellano
// igual que `registration_requests.status` ("pendiente") o `users.role`.

export const challenges = mysqlTable("challenges", {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    // borrador | abierto | cerrado
    status: varchar("status", { length: 20 }).notNull().default("borrador"),
    // Categoría de referencia: la más alta de `challenge_categories`. Es un
    // derivado que se mantiene para el chip, el orden y el índice de abajo; la
    // fuente de verdad de quién puede inscribirse es la tabla puente.
    categoryId: varchar("category_id", { length: 36 }).notNull(),
    // Puntaje configurable por desafío (defaults de la spec)
    participationPoints: int("participation_points").notNull().default(1),
    winPoints: int("win_points").notNull().default(3),
    lossPoints: int("loss_points").notNull().default(0),
    // Datos informativos: el desafío es de duración abierta, estas fechas se
    // muestran pero no abren ni cierran nada por sí solas.
    startDate: varchar("start_date", { length: 50 }),
    endDate: varchar("end_date", { length: 50 }),
    location: varchar("location", { length: 256 }),
    time: varchar("time", { length: 50 }),
    registrationFee: int("registration_fee"),
    maxSlots: int("max_slots").notNull().default(0), // 0 = sin límite
    createdByUserId: varchar("created_by_user_id", { length: 256 }).notNull(),
    openedAt: timestamp("opened_at"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    statusCategoryIdx: index("challenges_status_category_idx").on(table.status, table.categoryId),
    createdByIdx: index("challenges_created_by_idx").on(table.createdByUserId),
}));

// Categorías admitidas por el desafío. Membresía estricta: sólo se inscribe
// quien tiene una de estas categorías (o entra por excepción del admin). Es la
// fuente de verdad; `challenges.category_id` es sólo la más alta del conjunto.
export const challengeCategories = mysqlTable("challenge_categories", {
    challengeId: varchar("challenge_id", { length: 36 }).notNull(),
    categoryId: varchar("category_id", { length: 36 }).notNull(),
}, (table) => ({
    pk: primaryKey({ columns: [table.challengeId, table.categoryId] }),
    categoryIdx: index("challenge_categories_category_idx").on(table.categoryId),
}));

export const challengeCourts = mysqlTable("challenge_courts", {
    id: varchar("id", { length: 36 }).primaryKey(),
    challengeId: varchar("challenge_id", { length: 36 }).notNull(),
    number: int("number").notNull(),
    name: varchar("name", { length: 100 }),
    // libre | ocupada | inhabilitada
    status: varchar("status", { length: 20 }).notNull().default("libre"),
    // El candado de concurrencia: al ser UNIQUE, si dos parejas tocan "jugar"
    // en la misma cancha a la vez, la segunda transacción falla en la base y
    // no hace falta ningún lock aplicativo. MySQL permite varios NULL en un
    // índice único, que es lo que hace viable el patrón.
    currentMatchId: varchar("current_match_id", { length: 36 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    challengeIdx: index("challenge_courts_challenge_idx").on(table.challengeId),
    challengeNumberUniq: uniqueIndex("challenge_courts_challenge_number_uniq").on(table.challengeId, table.number),
    currentMatchUniq: uniqueIndex("challenge_courts_current_match_uniq").on(table.currentMatchId),
}));

export const challengeRegistrations = mysqlTable("challenge_registrations", {
    id: varchar("id", { length: 36 }).primaryKey(),
    challengeId: varchar("challenge_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 256 }).notNull(),
    // Snapshots del perfil al inscribirse: si el jugador después cambia su
    // categoría o su lado, el desafío en curso no se ve afectado.
    side: varchar("side", { length: 20 }).notNull(), // drive | reves | ambos
    categoryName: varchar("category_name", { length: 50 }),
    // disponible | emparejado | jugando | baja
    status: varchar("status", { length: 20 }).notNull().default("disponible"),
    // El admin puede inscribir salteando la validación de categoría.
    isException: boolean("is_exception").notNull().default(false),
    registeredAt: timestamp("registered_at").defaultNow().notNull(),
}, (table) => ({
    challengeUserUniq: uniqueIndex("challenge_registrations_challenge_user_uniq").on(table.challengeId, table.userId),
    challengeStatusIdx: index("challenge_registrations_challenge_status_idx").on(table.challengeId, table.status),
    userIdx: index("challenge_registrations_user_idx").on(table.userId),
}));

// Vínculo temporal entre dos jugadores. Se arma, se desarma y se rearma sin
// límite; por eso lleva `active` y `dissolvedAt` en vez de borrarse.
export const challengePairs = mysqlTable("challenge_pairs", {
    id: varchar("id", { length: 36 }).primaryKey(),
    challengeId: varchar("challenge_id", { length: 36 }).notNull(),
    playerAId: varchar("player_a_id", { length: 256 }).notNull(),
    playerBId: varchar("player_b_id", { length: 256 }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    dissolvedAt: timestamp("dissolved_at"),
}, (table) => ({
    challengeActiveIdx: index("challenge_pairs_challenge_active_idx").on(table.challengeId, table.active),
    playerAIdx: index("challenge_pairs_player_a_idx").on(table.playerAId),
    playerBIdx: index("challenge_pairs_player_b_idx").on(table.playerBId),
}));

export const challengeMatches = mysqlTable("challenge_matches", {
    id: varchar("id", { length: 36 }).primaryKey(),
    challengeId: varchar("challenge_id", { length: 36 }).notNull(),
    courtId: varchar("court_id", { length: 36 }).notNull(),
    // Los 4 jugadores desnormalizados: el historial sobrevive aunque las
    // parejas se disuelvan o se rearmen distinto.
    team1Player1Id: varchar("t1_p1_id", { length: 256 }).notNull(),
    team1Player2Id: varchar("t1_p2_id", { length: 256 }).notNull(),
    team2Player1Id: varchar("t2_p1_id", { length: 256 }).notNull(),
    team2Player2Id: varchar("t2_p2_id", { length: 256 }).notNull(),
    // Referencia histórica a las parejas que jugaron (pueden estar disueltas).
    pair1Id: varchar("pair1_id", { length: 36 }),
    pair2Id: varchar("pair2_id", { length: 36 }),
    // en_curso | resultado_cargado | confirmado | rechazado | cancelado
    status: varchar("status", { length: 25 }).notNull().default("en_curso"),
    // Resultado por sets: [{ t1: 6, t2: 4 }, { t1: 3, t2: 6 }]
    sets: json("sets"),
    gamesTeam1: smallint("games_team1"),
    gamesTeam2: smallint("games_team2"),
    winnerTeam: smallint("winner_team"), // 1 | 2
    reportedByUserId: varchar("reported_by_user_id", { length: 256 }),
    confirmedByUserId: varchar("confirmed_by_user_id", { length: 256 }),
    rejectionReason: text("rejection_reason"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    reportedAt: timestamp("reported_at"),
    confirmedAt: timestamp("confirmed_at"),
}, (table) => ({
    challengeStatusIdx: index("challenge_matches_challenge_status_idx").on(table.challengeId, table.status),
    courtIdx: index("challenge_matches_court_idx").on(table.courtId),
}));

export const challengeQueue = mysqlTable("challenge_queue", {
    id: varchar("id", { length: 36 }).primaryKey(),
    challengeId: varchar("challenge_id", { length: 36 }).notNull(),
    pairId: varchar("pair_id", { length: 36 }).notNull(),
    // Rival elegido de antemano; puede anotarse a esperar sin rival.
    rivalPairId: varchar("rival_pair_id", { length: 36 }),
    position: int("position").notNull(),
    // esperando | asignada | cancelada
    status: varchar("status", { length: 20 }).notNull().default("esperando"),
    enteredAt: timestamp("entered_at").defaultNow().notNull(),
    assignedAt: timestamp("assigned_at"),
}, (table) => ({
    challengeStatusPositionIdx: index("challenge_queue_challenge_status_position_idx").on(table.challengeId, table.status, table.position),
    pairIdx: index("challenge_queue_pair_idx").on(table.pairId),
}));

// El ledger. El ranking sale de acá y de ningún otro lado.
//
// `matchId` es NOT NULL con centinela "" a propósito: el punto de
// participación no viene de ningún partido, y si la columna fuera nullable el
// índice único NO lo protegería — MySQL considera que dos NULL son distintos,
// así que se podrían insertar dos participaciones para el mismo jugador. Con
// el centinela, el único cubre los tres tipos y confirmar dos veces nunca
// duplica puntos.
export const challengePoints = mysqlTable("challenge_points", {
    id: varchar("id", { length: 36 }).primaryKey(),
    challengeId: varchar("challenge_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 256 }).notNull(),
    // participacion | victoria | derrota
    type: varchar("type", { length: 20 }).notNull(),
    points: int("points").notNull(),
    matchId: varchar("match_id", { length: 36 }).notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    ledgerUniq: uniqueIndex("challenge_points_ledger_uniq").on(table.challengeId, table.userId, table.type, table.matchId),
    challengeUserIdx: index("challenge_points_challenge_user_idx").on(table.challengeId, table.userId),
    matchIdx: index("challenge_points_match_idx").on(table.matchId),
}));

export const challengesRelations = relations(challenges, ({ one, many }) => ({
    category: one(categoriesTable, {
        fields: [challenges.categoryId],
        references: [categoriesTable.id],
    }),
    createdBy: one(users, {
        fields: [challenges.createdByUserId],
        references: [users.id],
    }),
    categories: many(challengeCategories),
    courts: many(challengeCourts),
    registrations: many(challengeRegistrations),
    pairs: many(challengePairs),
    matches: many(challengeMatches),
    queue: many(challengeQueue),
    points: many(challengePoints),
}));

export const challengeCategoriesRelations = relations(challengeCategories, ({ one }) => ({
    challenge: one(challenges, { fields: [challengeCategories.challengeId], references: [challenges.id] }),
    category: one(categoriesTable, { fields: [challengeCategories.categoryId], references: [categoriesTable.id] }),
}));

export const challengeCourtsRelations = relations(challengeCourts, ({ one, many }) => ({
    challenge: one(challenges, { fields: [challengeCourts.challengeId], references: [challenges.id] }),
    matches: many(challengeMatches),
}));

export const challengeRegistrationsRelations = relations(challengeRegistrations, ({ one }) => ({
    challenge: one(challenges, { fields: [challengeRegistrations.challengeId], references: [challenges.id] }),
    user: one(users, { fields: [challengeRegistrations.userId], references: [users.id] }),
}));

export const challengePairsRelations = relations(challengePairs, ({ one }) => ({
    challenge: one(challenges, { fields: [challengePairs.challengeId], references: [challenges.id] }),
    playerA: one(users, { fields: [challengePairs.playerAId], references: [users.id] }),
    playerB: one(users, { fields: [challengePairs.playerBId], references: [users.id] }),
}));

export const challengeMatchesRelations = relations(challengeMatches, ({ one, many }) => ({
    challenge: one(challenges, { fields: [challengeMatches.challengeId], references: [challenges.id] }),
    court: one(challengeCourts, { fields: [challengeMatches.courtId], references: [challengeCourts.id] }),
    points: many(challengePoints),
}));

export const challengeQueueRelations = relations(challengeQueue, ({ one }) => ({
    challenge: one(challenges, { fields: [challengeQueue.challengeId], references: [challenges.id] }),
    pair: one(challengePairs, { fields: [challengeQueue.pairId], references: [challengePairs.id] }),
}));

export const challengePointsRelations = relations(challengePoints, ({ one }) => ({
    challenge: one(challenges, { fields: [challengePoints.challengeId], references: [challenges.id] }),
    user: one(users, { fields: [challengePoints.userId], references: [users.id] }),
}));

export type Challenge = InferSelectModel<typeof challenges>;
export type ChallengeCourt = InferSelectModel<typeof challengeCourts>;
export type ChallengeRegistration = InferSelectModel<typeof challengeRegistrations>;
export type ChallengePair = InferSelectModel<typeof challengePairs>;
export type ChallengeMatch = InferSelectModel<typeof challengeMatches>;
export type ChallengeQueueEntry = InferSelectModel<typeof challengeQueue>;
export type ChallengePoint = InferSelectModel<typeof challengePoints>;
