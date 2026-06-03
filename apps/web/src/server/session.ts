import { createServerFn } from '@tanstack/react-start'

export type SessionUser = {
	id: string
	email: string
	username: string | null
	name: string
	firstName: string | null
	lastName: string | null
	nickname: string | null
	image: string | null
	isAdmin: boolean
	curriculumId: number | null
	policyViewed: boolean
}

/**
 * Current session for the request. The `./auth.server` import is referenced only
 * inside this handler, so the client build strips it (and better-auth/drizzle/pg).
 */
export const getSessionFn = createServerFn({ method: 'GET' }).handler(async () => {
	const { readUser } = await import('./auth.server')
	return readUser()
})
