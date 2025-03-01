# Token-Based Authentication Demo
This project demonstrates a token-based auth system.

[Watch the demo](https://drive.google.com/file/d/1NsOfH24MgFz1GKbIf32WlyWMJbdUbohi/view?usp=drive_link)

## Tech Stack
 - express.js
 - drizzle
 - postgress
 - zod
 - docker

## Setup

To set up the project, run the following commands:

```bash
docker compose up
npm run db:generate
npm run db:migrate
npm run db:studio
npm run dev
// Optionally, run the seed in Drizzle Studio
```

To remove container
```sh
docker compose down
```

To signup, goto `/api/auth/signup`
```sh
{
    "email": "sample@sample.com",
    "password": "Sample!kdew",
    "fName": "fname", 
    "lName": "lname"
}
```

To signin, goto `/api/auth/signin`
```sh
{
    "email": "sample@sample.com",
    "password": "Sample!kdew"
}
```

## Authentication Flow

### Signup Flow
1. A new record is created in the `user` table.
2. A new session record is created in the `session` table
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

