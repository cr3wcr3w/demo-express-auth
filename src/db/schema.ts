import { text, timestamp, boolean, pgEnum, pgSchema, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const authSchema = pgSchema("auth");

export const userRoleEnum = pgEnum("user_role", ["super_admin", "admin", "guest"]);

export const user = authSchema.table("user", {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull().unique(),
    image: text('image'),
    roleId: uuid("role_id").references(() => roles.id, { onDelete: "set null" }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    encryptedPassword: text('encrypted_password').notNull(),
    // Token for password reset (forgot password).
    recoveryToken: text('recovery_token'),
    recoverySentAt: timestamp('recovery_sent_at')
});

export const roles = authSchema.table("roles", {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: userRoleEnum("name").notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const session = authSchema.table("session", {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    // If not_after is reached, the session expires.
    notAfter: timestamp('not_after').notNull(),
    // If a refresh token is used, refresh_at is updated.
    refreshAt: timestamp("refresh_at"),
    ipAddress: text('ip_address').notNull(),
    userAgent: text('user_agent').notNull(),
});

export const refreshTokens = authSchema.table("refresh_tokens", {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    token: text("token").notNull().unique(),
    sessionId: uuid("session_id").notNull().references(() => session.id, { onDelete: "cascade" }),
    revoked: boolean("revoked").default(false),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull()
});

export const oneTimeTokens = authSchema.table("one_time_tokens", {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    tokenType: text("token_type").notNull(), // e.g., "email_verification", "password_reset", "re_authentication", "invitation"
    tokenHash: text("token_hash").notNull().unique(),
    userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    revoked: boolean("revoked").default(false),
});

