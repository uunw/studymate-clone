import { auth } from '@repo/auth/server'
import { createFileRoute } from '@tanstack/react-router'

/** Mounts the Better Auth request handler at /api/auth/*. Server-only. */
export const Route = createFileRoute('/api/auth/$')({
	server: {
		handlers: {
			GET: ({ request }) => auth.handler(request),
			POST: ({ request }) => auth.handler(request),
		},
	},
})
