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

## todo 
1. create a sample protected api routes 
2. use scrypt
3. implement nodemailer using gmail, create another branch for this
