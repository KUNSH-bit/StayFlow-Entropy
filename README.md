# StayFlow

StayFlow is a multi-hotel operations platform. The React application in `frontend/` uses the Express API in `server/`; PostgreSQL is the system of record through Prisma.

## Quick start

Requirements: PostgreSQL and Node.js 20.19+, 22.12+, or 24+.

1. Create an empty local PostgreSQL database and a database user.
2. Configure the server and apply the initial migration to that empty development database:

   ```sh
   cd server
   npm install
   cp -n .env.example .env  # leaves an existing .env untouched
   # Set DATABASE_URL in .env to the local development database.
   npm run prisma:validate
   npm run prisma:generate
   npm run prisma:migrate:deploy
   npm run dev
   ```

3. In another terminal, configure and start the frontend:

   ```sh
   cd frontend
   npm install
   cp -n .env.example .env  # leaves an existing .env untouched
   npm run dev
   ```

Open `http://127.0.0.1:5173`. Registering creates an owner account and a hotel workspace. There are no demo credentials or seeded hotel records. Add rooms before creating reservations.

The API listens at `http://127.0.0.1:3000`; `GET /health` is a liveness check and `GET /health/ready` verifies PostgreSQL connectivity. The frontend sends credentialed requests to `VITE_API_BASE_URL` (default `http://127.0.0.1:3000/api`).

> Only apply the initial migration to a new, empty development database. The repository environment does not establish that any configured target is disposable. Before migrating an existing database, make and verify a backup, inspect its schema and migration history, and baseline it deliberately. No production data should be dropped or replaced.

## Checks

```sh
cd server
npm run prisma:validate
npm run prisma:generate
npm run typecheck
npm run build
npm test
```

```sh
cd frontend
npm run build
```

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md), [DATABASE_REQUIREMENTS.md](./DATABASE_REQUIREMENTS.md), and [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for contracts, data layout, verification, and remaining setup.

## Integrations

- Google Calendar OAuth requires Google OAuth credentials, a callback URL, and a 32-byte integration encryption key. Until configured, private iCalendar feeds work without Google.
- SMTP settings enable outbound email. Inbound email supports a staff import flow and an authenticated provider webhook routed by each hotel's inbound address.
- Without an OpenAI API key, the assistant answers supported operational questions locally. With a key, the server sends a tenant-scoped summary plus a question with known guest/staff names, emails, and guest phone numbers redacted to the Responses API; the model receives no tools.
- Payments are recorded as offline methods (cash, bank transfer, UPI, or terminal/card reference). StayFlow does not collect or store card numbers.

External credentials are optional for local development and are never placed in frontend environment variables.
