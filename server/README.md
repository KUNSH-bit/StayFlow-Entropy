# StayFlow backend

Phase 1 provides the Express and TypeScript API foundation. It uses strict TypeScript, Zod environment validation, Helmet, CORS, structured request logs, centralized errors, and a health endpoint.

## Requirements

- Node.js 20.6 or newer
- npm

## Setup

```sh
cd server
npm install
cp .env.example .env
```

Edit `.env` for the local environment. The sample `DATABASE_URL` is only a placeholder; no database connection is made while the teammate-managed Prisma schema is absent.

## Development

```sh
npm run dev
```

The API listens on `http://127.0.0.1:3000` by default. `GET /health` reports API status separately from database integration status.

## Build and checks

```sh
npm run typecheck
npm run build
npm test
npm start
```

The generated production entry point is `dist/server.js`. See [`DATABASE_REQUIREMENTS.md`](DATABASE_REQUIREMENTS.md) for the work needed to connect Prisma after the database schema is provided.
