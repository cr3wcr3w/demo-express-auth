## notes

1. use scrypt algorithm to hash passwords
 - This algorithm is designed to be memory-hard and CPU-intensive
 - https://www.npmjs.com/package/noble-hashes
 - https://www.npmjs.com/package/scrypt-js

2. session expiration
 - sessions expire after 7 days
 - each time a session is used, if it reaches the updateAge threshold, the expiration date is extended, which by default is set to 1 day.

3. CSRF Protection
 - validating the Origin header in requests
 - This check confirms that requests originate from the application or a trusted source. 

4. Cookies
 - set with samesite 
 - set with httponly

5. Rate Limiting


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

## todo 
1. create a sample protected api routes 
2. use scrypt
3. implement nodemailer using gmail, create another branch for this
