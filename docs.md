# Setup 


## Environment Variables
create an .env file in the root directory and configure the required environment variables:
```bash
DATABASE_URL=
BACKEND_PORT=
BACKEND_AUTH_PRIVATE_KEY=
```

## Database setup
Generate Migrations
`npm run db:generate`
Apply Migrations
`npm run db:migrate`
Seeding Initial Data
`npm run seed`

## Database Studio
To explore the database schema using Drizzle Studio:
`npm run db:studio`

## Running the Application
Development Mode
`npm run dev`
Production Mode
```bash
npm run build
npm run start
```