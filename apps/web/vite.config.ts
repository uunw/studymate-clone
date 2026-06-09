import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Pure client SPA (Firebase migration): no SSR, no server functions. host:true
// binds all interfaces (127.0.0.1 + LAN) for device testing.
export default defineConfig({
	server: { port: 3000, host: true },
	resolve: {
		alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
	},
	plugins: [
		tailwindcss(),
		// tanstackRouter() generates routeTree.gen.ts; must precede viteReact().
		tanstackRouter({ target: 'react', autoCodeSplitting: true }),
		viteReact(),
	],
})
