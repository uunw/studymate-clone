import { defineConfig } from 'drizzle-kit'

export default defineConfig({
	schema: './src/schema/index.ts',
	out: './drizzle',
	dialect: 'postgresql',
	casing: 'snake_case',
	dbCredentials: {
		url: process.env.DATABASE_URL ?? 'postgres://studymate:studymate@localhost:5432/studymate',
	},
	verbose: true,
	strict: true,
})
