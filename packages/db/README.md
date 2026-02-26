# @yigyaps/db

The PostgreSQL database schemas, DALs, and migrations for YigYaps.

## Features

- Managed via Drizzle ORM and `drizzle-kit`
- Fully typed data access layers (DALs) with transaction support
- Scalable schema design indexing installations, reviews, and mints

## Scripts

- `npm run db:generate`: Generate new SQL migration files
- `npm run db:push`: Push changes directly to the database
- `npm run db:studio`: Launch Drizzle Studio UI

## Accessing Database

Schemas are exported from `src/schema/skill-packages.ts`, DALs from `src/dal/`.
