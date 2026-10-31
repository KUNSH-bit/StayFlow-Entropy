# StayFlow API server

Express 5 and TypeScript API with Prisma 7, PostgreSQL, database-backed sessions, hotel membership/role checks, and operational routes.

See the [root README](../README.md) for setup and the root [API documentation](../API_DOCUMENTATION.md) and [database requirements](../DATABASE_REQUIREMENTS.md) for contracts and schema.

## Local commands

```sh
npm install
cp -n .env.example .env  # leaves an existing .env untouched
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:deploy  # only for a new, empty development database
npm run dev
```

The default listener is `127.0.0.1:3000`. `GET /health` is a liveness endpoint; `GET /health/ready` checks PostgreSQL with `SELECT 1`.

`npm run build` emits the production server at `dist/server.js`, which `npm start` launches.

## Verification commands

```sh
npm run typecheck
npm run build
npm test
```

External Google Calendar, SMTP, inbound email, and OpenAI settings are optional. Copy values from `.env.example` and never commit `.env`.
