import { db, schema } from '@repo/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { genericOAuth, username } from 'better-auth/plugins'

/** Real KMITL accounts are <studentId>@kmitl.ac.th. */
export const KMITL_EMAIL_DOMAIN = 'kmitl.ac.th'
const STUDENT_ID_RE = /^\d{8}$/

/** OIDC provider id — also the callback path segment (/api/auth/oauth2/callback/kmitl). */
export const KMITL_SSO_PROVIDER_ID = 'kmitl'

/**
 * Auth is KMITL SSO only — a generic OIDC provider via Better Auth's
 * genericOAuth plugin (the "Other Social Providers" pattern; no vendor helper).
 * Register an SSO client at https://developer.kmitl.ac.th and set:
 *   KMITL_SSO_CLIENT_ID, KMITL_SSO_CLIENT_SECRET,
 *   KMITL_SSO_ISSUER  (e.g. https://<sso-host>/realms/master — discovery is derived)
 * Register the redirect URI: <BETTER_AUTH_URL>/api/auth/oauth2/callback/kmitl
 */
const ssoEnabled = !!(
	process.env.KMITL_SSO_CLIENT_ID &&
	process.env.KMITL_SSO_CLIENT_SECRET &&
	process.env.KMITL_SSO_ISSUER
)
const discoveryUrl = process.env.KMITL_SSO_ISSUER
	? `${process.env.KMITL_SSO_ISSUER.replace(/\/$/, '')}/.well-known/openid-configuration`
	: undefined

type OidcProfile = {
	sub?: string
	email?: string
	preferred_username?: string
	given_name?: string
	family_name?: string
	name?: string
	// KMITL's default scopes (openid profile email) do NOT include the 8-digit
	// student id — it's a special claim you must request from KDMC. Set
	// KMITL_SSO_STUDENT_ID_CLAIM to that claim name once granted.
	[claim: string]: unknown
}

/**
 * Derive a stable user handle (preferably the 8-digit student id) from OIDC claims.
 * Order: explicit student-id claim → numeric preferred_username → numeric email
 * local-part → preferred_username → sub.
 */
function deriveUsername(profile: OidcProfile): string | undefined {
	const claimName = process.env.KMITL_SSO_STUDENT_ID_CLAIM
	const fromClaim = claimName ? profile[claimName] : undefined
	if (typeof fromClaim === 'string' && fromClaim) return fromClaim

	const preferred = profile.preferred_username ?? ''
	if (STUDENT_ID_RE.test(preferred)) return preferred

	const local = (profile.email ?? '').toLowerCase().split('@')[0] ?? ''
	if (STUDENT_ID_RE.test(local)) return local

	return preferred || profile.sub || undefined
}

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
	secret: process.env.BETTER_AUTH_SECRET,
	trustedOrigins: [process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'],

	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user: schema.user,
			session: schema.session,
			account: schema.account,
			verification: schema.verification,
		},
	}),

	// Email + password fallback (KMITL SSO is primary; this keeps the app usable
	// before the SSO client is provisioned). Login by email or by student-id username.
	emailAndPassword: {
		enabled: true,
		autoSignIn: true,
		minPasswordLength: 8,
	},

	// StudyMate profile columns live on the user table. `username` holds the
	// 8-digit student id, mapped from the OIDC claims at first sign-in.
	user: {
		additionalFields: {
			firstName: { type: 'string', required: false },
			lastName: { type: 'string', required: false },
			nickname: { type: 'string', required: false },
			isAdmin: { type: 'boolean', required: false, defaultValue: false, input: false },
			curriculumId: { type: 'number', required: false },
			policyViewed: { type: 'boolean', required: false, defaultValue: false, input: false },
		},
	},

	plugins: [
		username({
			minUsernameLength: 8,
			maxUsernameLength: 8,
			usernameValidator: (value) => STUDENT_ID_RE.test(value),
		}),
		genericOAuth({
			config: ssoEnabled
				? [
						{
							providerId: KMITL_SSO_PROVIDER_ID,
							clientId: process.env.KMITL_SSO_CLIENT_ID as string,
							clientSecret: process.env.KMITL_SSO_CLIENT_SECRET as string,
							discoveryUrl: discoveryUrl as string,
							scopes: ['openid', 'profile', 'email'],
							pkce: true,
							mapProfileToUser: (profile: OidcProfile) => {
								const username = deriveUsername(profile)
								// Extra keys are valid additionalFields; the cast satisfies the
								// generic mapProfileToUser return type (it can't infer them).
								return {
									name:
										profile.name ??
										`${profile.given_name ?? ''} ${profile.family_name ?? ''}`.trim(),
									username,
									firstName: profile.given_name,
									lastName: profile.family_name,
									nickname: profile.given_name ?? username,
								} as { name?: string; email?: string }
							},
						},
					]
				: [],
		}),
	],
})

export type Auth = typeof auth
export type Session = Auth['$Infer']['Session']

export const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'

/**
 * KMITL's `end_session_endpoint` from the OIDC discovery doc, for Single Logout.
 * genericOAuth (consumer) has no built-in provider logout, so we resolve it once
 * and cache it. Returns null when SSO isn't configured or the fetch fails.
 */
let endSessionCache: string | null | undefined
export async function getSsoEndSessionEndpoint(): Promise<string | null> {
	if (endSessionCache !== undefined) return endSessionCache
	if (!discoveryUrl) {
		endSessionCache = null
		return null
	}
	try {
		const res = await fetch(discoveryUrl)
		const doc = (await res.json()) as { end_session_endpoint?: string }
		endSessionCache = doc.end_session_endpoint ?? null
	} catch {
		endSessionCache = null
	}
	return endSessionCache
}
