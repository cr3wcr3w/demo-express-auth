# Token-Based Authentication Demo
This project demonstrates a token-based auth system.

[Watch the demo](https://drive.google.com/file/d/1MWEBoHmmbbAgP8kQrX8RzJPiHX8BssxH/view?usp=drive_link)

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

## Auth Flow

### Signup Flow
1. A new record is created in the `user` table.

### Signin Flow
1. Retrieve user data based on email.
2. Validate credentials by hashing the input password and comparing it with `encryptedPassword`.
3. If authentication succeeds:
   - A new session record is created in the `session` table.
   - A new refresh token is created in the `refresh_tokens` table.
4. Generate an access token and return it along with the refresh token.

### Signout Flow
1. The user sends a POST request to /api/auth/logout.
2. The refresh token is retrieved from the cookie.
3. If found in the database, it is marked as revoked: true.
4. The refresh token cookie is cleared from the client.
5. The user is now logged out.

### Authorization Flow
1. The client sends a request to a protected route with the access token in the `Authorization header: Authorization: Bearer <access_token>`.
2. The backend verifies the access token:
    - If valid, proceed with the request.
    - If expired or invalid, return a 401 Unauthorized error.
    - If the access token is expired, the client must send the refresh token (stored in cookies) along with the request.
4. The backend verifies the refresh token:
    - If valid, decode it to extract the session ID.
    - Check if the session exists and is not expired or revoked.
    - If everything is valid, allow the request to proceed.
    - If invalid, the client needs to call logout to clear cookies.

### Refresh Flow
1. The backend verifies the refresh token:
    - If the refresh token is invalid or expired
    - If valid, then sent back to the client


### Email Verification, Password Reset, Reauthentication, Invitation `(not implemented yet)`
1. Frontend Calls `auth/create_token`
    - The frontend sends a request to POST `/auth/create_token` with:
        - `tokenType` (`email_verification`, `password_reset`, `invitation`, etc)
        - `userId`
        - `metadata` (optional, e.g., `{ "role": "admin" }` for invitations)
    - Backend does the following:
        - Generates a secure random token.
        - Saves it in the one_time_tokens table along with:
            - `tokenType`
            - `userId`
            - `metadata`
            - `createdAt`, `updatedAt`
        - Sends the plain token (not hashed) in an email with a URL like:
            - `https://your-app.com/auth/verify?token=xxx`
2. User Clicks the Link in Email
    - The frontend extracts the `token` from the URL.
3. Frontend Calls `auth/validate_token?token=xxx`
    - Frontend sends the plain token to the backend.
    - Backend does the following:
        - Hashes the received token.
        - Looks up the hashed token in `one_time_tokens`.
        - If no token is found → Return error (invalid).
        - If found and `revoked = false`:
            - Revokes the token (`revoked = true`).
            - Generates a one_time_token and sends it in cookie
                - valid for 1 hour
                - httpOnly
                - samesite
            - return json 
            ```json
            {
                "tokenType": "invitation",
                "metadata": { "role": "clown" }
                // "tokenType": "password_reset",
                // "metadata": {}
            }
            ``` 
4. Frontend Redirects Based on Token Type and meta data
    - Frontend reads the response, checks the tokenType and metadata, and redirects the user:
        - When the user accesses `/email-verified`, `/reset-password`, or `/signup?role=clown`:
            - Backend checks the cookie.
            - If the access token is expired → return an error
            - If the access token is valid → Allow the action.

5. Backend Checks Access Token for Any Request
   - backend will look at the cookie if its not expired