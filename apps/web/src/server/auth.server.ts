import { auth } from '@repo/auth/server'
import { getRequest } from '@tanstack/react-start/server'
import type { SessionUser } from './session'

/**
 * Server-only auth helpers. Imported ONLY inside createServerFn `.handler()`
 * bodies so the TanStack Start plugin strips it (and its heavy deps:
 * better-auth, drizzle, pg) from the client bundle.
 */
export async function readUser(): Promise<SessionUser | null> {
	const request = getRequest()
	const session = await auth.api.getSession({ headers: request.headers })
	if (!session?.user) return null
	const u = session.user as unknown as SessionUser
	return {
		id: u.id,
		email: u.email,
		username: u.username ?? null,
		name: u.name,
		firstName: u.firstName ?? null,
		lastName: u.lastName ?? null,
		nickname: u.nickname ?? null,
		image: u.image ?? null,
		isAdmin: !!u.isAdmin,
		curriculumId: u.curriculumId ?? null,
		policyViewed: !!u.policyViewed,
	}
}

export async function requireUser(): Promise<SessionUser> {
	const user = await readUser()
	if (!user) throw new Error('UNAUTHORIZED')
	return user
}

export async function requireAdmin(): Promise<SessionUser> {
	const user = await requireUser()
	if (!user.isAdmin) throw new Error('FORBIDDEN')
	return user
}
