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


### Email Verification, Password Reset, Reauthentication, Invitation
1. Generate a token and store it in `one_time_tokens`.
2. Send the token as a link.
3. When the user clicks the link:
   - Extract the token from the URL.
   - Hash the token and look it up in `one_time_tokens`.
   - If found, revoke it and proceed with the action.


