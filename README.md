# Token-Based Authentication Demo
This project demonstrates a token-based auth system.

## Tech Stack
 - express.js
 - drizzle
 - postgress
 - zod
 - docker

## Setup

To set up the project, run the following commands:

```bash
npm run seed
docker compose up
npm run db:generate
npm run db:migrate
npm run db:studio
npm run dev
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
    "firstName": "fname", 
    "lastName": "lname"
}
```

To signin, goto `/api/auth/signin`
```sh
{
    "email": "sample@sample.com",
    "password": "Sample!kdew"
}
```
