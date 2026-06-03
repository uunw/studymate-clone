import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

/**
 * Drizzle client backed by node-postgres.
 *
 * - Local dev: plain Postgres (docker compose).
 * - Production (Neon/Vercel): point DATABASE_URL at Neon's **pooled** connection
 *   string (the `-pooler` endpoint / PgBouncer). node-postgres over the pooler is
 *   serverless-safe. For Edge runtime, swap to `drizzle-orm/neon-serverless`
 *   (`@neondatabase/serverless`) — the schema and query code are identical.
 */
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
	throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.')
}

// Reuse the pool across hot-reloads / serverless invocations in the same isolate.
const globalForDb = globalThis as unknown as { __pool?: Pool }

export const pool =
	globalForDb.__pool ??
	new Pool({
		connectionString,
		max: process.env.NODE_ENV === 'production' ? 5 : 10,
	})

if (process.env.NODE_ENV !== 'production') globalForDb.__pool = pool

export const db = drizzle(pool, { schema, casing: 'snake_case' })

export type Database = typeof db
