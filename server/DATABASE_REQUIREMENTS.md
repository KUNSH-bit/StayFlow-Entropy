# Database coordination requirements

The workspace did not contain a Prisma schema or generated Prisma Client at the start of Phase 1. Database ownership belongs to the database teammate, so no schema, migrations, or generated database models have been created here. The API health endpoint reports `checks.database: "not_integrated"` and does not claim database connectivity.

When the teammate-managed database setup is available, coordinate these items before adding queries:

- The authoritative `schema.prisma` path and the Prisma ORM version used by the project.
- The configured Prisma Client generator and generated-client output/import path.
- The supported client generation command. Client generation must use the teammate's schema and must not run migrations.
- The runtime connection configuration and environment variable name (the current placeholder is `DATABASE_URL`).
- The result of generating the client from the supplied schema, plus a non-destructive connection check in an approved development environment.

Phase 1 defines no application models or fields. Future database requirements should be recorded here after reviewing the actual schema; backend code must not assume a model exists before then.
