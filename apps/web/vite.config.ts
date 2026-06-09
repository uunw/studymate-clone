import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Pure client SPA (Firebase migration): no SSR, no server functions. host:true
// binds all interfaces (127.0.0.1 + LAN) for device testing.
export default defineConfig({
	// VITE_* env (e.g. VITE_FIREBASE_*) lives in the monorepo-root .env.
	envDir: fileURLToPath(new URL('../../', import.meta.url)),
	server: { port: 3000, host: true },
	resolve: {
		alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
	},
	build: {
		rollupOptions: {
			output: {
				// Split the heavy, rarely-changing vendors into their own long-cached
				// chunks (app code changes far more often). pdfjs (unpdf) is left alone
				// — it's already a lazy async chunk via the dynamic import in
				// server/transcript.ts, and must stay that way.
				manualChunks(id) {
					if (!id.includes('node_modules')) return
					if (/[\\/](firebase|@firebase|@grpc|protobufjs|idb)[\\/]/.test(id)) return 'firebase'
					if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react'
					if (id.includes('@tanstack')) return 'tanstack'
				},
			},
		},
		// Keeps the eager vendor chunks (firebase ~333kB the largest) under the
		// warning. The lazy pdfjs (unpdf) chunk still trips it — that's expected and
		// fine: it only loads on transcript upload, never on first paint.
		chunkSizeWarningLimit: 700,
	},
	plugins: [
		tailwindcss(),
		// tanstackRouter() generates routeTree.gen.ts; must precede viteReact().
		tanstackRouter({ target: 'react', autoCodeSplitting: true }),
		viteReact(),
	],
})
