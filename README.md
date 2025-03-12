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
docker compose up
npm run db:generate
npm run db:migrate
npm run db:studio
npm run seed
npm run dev
```

To remove container
```sh
docker compose down
```

Postman Collection (documentation)
[jk-added-token-auth.postman_collection.json](./public/jk-added-token-auth.postman_collection.json)
