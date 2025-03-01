# Token-Based Authentication Demo
This project demonstrates a token-based authentication system.

[Watch the demo](https://drive.google.com/file/d/1jS9XI4IZDmlEyX3Qh7Bi-B_ZiULoQzX2/view?usp=sharing)

## Tech Stack
 - express.js
 - drizzle
 - postgress
 - zod
 - docker

## Setup

To set up the project, run the following commands:

```sh
docker compose up
npm run db:generate
npm run db:migrate
npm run db:studio
```

To remove container
```sh
docker ps -a
docker stop <containerId>
docker remove <containerId>
```

To signup, goto `/api/auth/signup`
```sh
json body 
{
    "email": "sample@sample.com",
    "password": "Sample!kdew",
    "fName": "fname", 
    "lName": "lname"
}
```

To signin, goto `/api/auth/signin`
```sh
json body 
{
    "email": "sample@sample.com",
    "password": "Sample!kdew"
}
```

## Database Schema

The authentication system uses the following schema defined with `drizzle-orm`:

### User Table
```typescript
export const user = authSchema.table("user", {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv4()),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull().unique(),
    image: text('image'),
    roleId: uuid("role_id").references(() => roles.id, { onDelete: "set null" }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    encyptedPassword: text('encyrpted_password').notNull(),
    recoveryToken: text('recovery_token'),
    recoverySentAt: timestamp('recovery_sent_at'),
    reauthenticationToken: text('reauthentication_token'),
    reauthenticationSentAt: timestamp('reauthentication_sent_at')
});
```

### Roles Table
```typescript
export const roles = authSchema.table("roles", {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv4()),
    name: userRoleEnum("name").notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
});
```

### Session Table
```typescript
export const session = authSchema.table("session", {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv4()),
    userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    notAfter: timestamp('not_after').notNull(),
    refreshAt: timestamp("refresh_at"),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
});
```

### Refresh Tokens Table
```typescript
export const refreshTokens = authSchema.table("refresh_tokens", {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv4()),
    token: text("token").notNull().unique(),
    sessionId: uuid("session_id").notNull().references(() => session.id, { onDelete: "cascade" }),
    revoked: boolean("revoked").default(false),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull()
});
```

### One-Time Tokens Table
```typescript
export const oneTimeTokens = authSchema.table("one_time_tokens", {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv4()),
    tokenType: text("token_type").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    revoked: boolean("revoked").default(false),
});
```

## Authentication Flow

### Signup Flow
1. A new record is created in the `user` table.
2. A new session record is created in the `session` table (if auto-login is enabled)
3. A refresh token is generated and stored in the `refresh_tokens` table.

### Signin Flow
1. Retrieve user data based on email.
2. Validate credentials by hashing the input password and comparing it with `encryptedPassword`.
3. If authentication succeeds:
   - A new session record is created in the `session` table.
   - A new refresh token is created in the `refresh_tokens` table.
4. Generate an access token and return it along with the refresh token.

### Email Verification, Password Reset, Reauthentication, Invitation
1. Generate a token and store it in `one_time_tokens`.
2. Send the token as a link.
3. When the user clicks the link:
   - Extract the token from the URL.
   - Hash the token and look it up in `one_time_tokens`.
   - If found, revoke it and proceed with the action.

## Token Management

- **Access Token:**
  - Short-lived: 2 minutes
  - Stores user identifier, claims, permissions, roles
  - Stored in memory (lost on full reload)
  - Generated for every authorized request

- **Refresh Token:**
  - Long-lived: 1 day
  - Stores user identifier
  - Stored in a `httpOnly` cookie and database
  - Generated at login

