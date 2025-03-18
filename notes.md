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
1. use scrypt for encrypting and decrypting
2. each time a session is used, if it reaches the updateAge threshold, the expiration date is extended, which by default is set to 1 day.
3. implement nodemailer using gmail, create another branch for this
4. run testing


---
read owasp
https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/
https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html

blogs
https://dev.to/sre_panchanan/owasp-api52023-broken-function-level-authorization-2nhm


---
continues login is also possible to implement by using `notAfter` even thou refresh have a expiration
  - to have a continues login it needs to rotate the access and refresh (atm this functionality is removed) and in getProfile api should extend the notAfter expiration if they access this api within the same day of notAfter
