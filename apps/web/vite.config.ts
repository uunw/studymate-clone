import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Load the monorepo-root .env into process.env so server-side code (db/auth,
// which read process.env at runtime) works in local dev. In production these
// come from the hosting platform's env vars.
const rootEnvDir = fileURLToPath(new URL('../../', import.meta.url))
Object.assign(process.env, loadEnv('development', rootEnvDir, ''))

export default defineConfig({
	server: { port: 3000 },
	envDir: rootEnvDir,
	resolve: {
		alias: {
			'~': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	ssr: {
		// Workspace packages ship TS source → must be transformed by Vite.
		noExternal: ['@repo/db', '@repo/auth', '@repo/core', '@repo/ui'],
		// Heavy node-only deps: keep external (required at runtime, not bundled).
		// Bundling drizzle/better-auth pulls in unused dialects and breaks rollup.
		external: ['drizzle-orm', 'pg', 'better-auth', 'nodemailer', 'unpdf'],
	},
	plugins: [
		tailwindcss(),
		// tanstackStart() must come before viteReact().
		tanstackStart(),
		viteReact(),
	],
})
