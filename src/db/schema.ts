import { text, timestamp, boolean, pgEnum, pgSchema } from "drizzle-orm/pg-core";
import { v4 as uuidv4 } from 'uuid';

export const authSchema = pgSchema("auth");

export const userRoleEnum = pgEnum("user_role", ["resident", "waste_worker", "manager", "admin", "guest"]);

export const user = authSchema.table("user", {
    id: text("id").primaryKey().$defaultFn(() => uuidv4()),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull().unique(),
    image: text('image'),
    role: userRoleEnum("role").notNull().default('guest'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    encyptedPassword: text('encyrpted_password').notNull(),
    // Token for password reset (forgot password).
    recoveryToken: text('recovery_token'),
    recoverySentAt: timestamp('recovery_sent_at'),
    // Token used for re-authentication (e.g., changing email/password).
    reauthenticationToken: text('reauthentication_token'),
    reauthenticationSentAt: timestamp('reauthentication_sent_at')
});

export const session = authSchema.table("session", {
    id: text("id").primaryKey().$defaultFn(() => uuidv4()),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    // If not_after is reached, the session expires.
    notAfter: timestamp('not_after').notNull(),
    // If a refresh token is used, refresh_at is updated.
    refreshAt: timestamp("refresh_at"),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
});

export const refreshTokens = authSchema.table("refresh_tokens", {
    id: text("id").primaryKey().$defaultFn(() => uuidv4()),
    token: text("token").notNull().unique(),
    sessionId: text("session_id").notNull().references(() => session.id, { onDelete: "cascade" }),
    revoked: boolean("revoked").default(false),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull()
});

export const oneTimeTokens = authSchema.table("one_time_tokens", {
    id: text("id").primaryKey().$defaultFn(() => uuidv4()),
    tokenType: text("token_type").notNull(), // e.g., "email_verification", "password_reset"
    tokenHash: text("token_hash").notNull().unique(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    revoked: boolean("revoked").default(false),
});

