# @yigyaps/api

The standalone Fastify API server for YigYaps.

## Features

- GitHub OAuth integration with HttpOnly secure cookies
- Zod-based request validation
- Drizzle ORM integrated with PostgreSQL
- Transactional database operations
- Swagger UI available at `/docs`

## Scripts

- `npm run dev`: Start development server on port 3100
- `npm run build`: Compile TypeScript
- `npm start`: Start production server

## Security

- AES-256 Envelope Encryption via Vault for skill logic
- Role-based authorization (`admin`, `user`)
- Configurable rate limits and strict CORS policies
