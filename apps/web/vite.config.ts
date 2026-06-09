import fs from 'node:fs'
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

// Local HTTPS for dev: browsers with HTTPS-First / HSTS force-upgrade
// http→localhost/127.0.0.1 to https, which breaks the http OAuth callback. Serve
// real TLS when a self-signed cert exists (apps/web/certs/, gitignored — generate
// with `openssl req -x509 -nodes -newkey rsa:2048 -keyout dev-key.pem -out
// dev-cert.pem -subj /CN=localhost -addext subjectAltName=DNS:localhost,IP:127.0.0.1`).
// Falls back to plain http (and so CI/other machines) when the cert is absent.
const keyPath = fileURLToPath(new URL('./certs/dev-key.pem', import.meta.url))
const certPath = fileURLToPath(new URL('./certs/dev-cert.pem', import.meta.url))
const https =
	fs.existsSync(keyPath) && fs.existsSync(certPath)
		? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
		: undefined

export default defineConfig({
	// host:true binds all interfaces (127.0.0.1 + LAN), not just IPv6 localhost —
	// lets you reach the app at 127.0.0.1 (sidesteps any localhost HSTS pin) and
	// test the mobile UI from a phone on the same network.
	server: { port: 3000, host: true, https },
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
