import { BETTER_AUTH_URL, getSsoEndSessionEndpoint, KMITL_SSO_PROVIDER_ID } from '@repo/auth/server'
import { and, db, eq, schema } from '@repo/db'
import { readUser } from './auth.server'

/**
 * Build the KMITL SSO end-session URL for the current user (Single Logout).
 * Returns null when there's no session, SSO isn't configured, or the IdP
 * doesn't advertise an end_session_endpoint — callers then just sign out locally.
 */
export async function buildSsoLogoutUrl(): Promise<string | null> {
	const user = await readUser()
	if (!user) return null

	const endSession = await getSsoEndSessionEndpoint()
	if (!endSession) return null

	const [account] = await db
		.select({ idToken: schema.account.idToken })
		.from(schema.account)
		.where(
			and(eq(schema.account.userId, user.id), eq(schema.account.providerId, KMITL_SSO_PROVIDER_ID)),
		)
		.limit(1)

	const params = new URLSearchParams({ post_logout_redirect_uri: BETTER_AUTH_URL })
	if (account?.idToken) params.set('id_token_hint', account.idToken)
	return `${endSession}?${params.toString()}`
}
