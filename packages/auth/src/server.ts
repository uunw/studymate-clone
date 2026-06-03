import { db, schema } from '@repo/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { genericOAuth } from 'better-auth/plugins'

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
	email?: string
	preferred_username?: string
	given_name?: string
	family_name?: string
	name?: string
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

	// StudyMate profile columns live on the user table. `username` holds the
	// 8-digit student id, mapped from the OIDC claims at first sign-in.
	user: {
		additionalFields: {
			username: { type: 'string', required: false, input: false },
			firstName: { type: 'string', required: false, input: false },
			lastName: { type: 'string', required: false, input: false },
			nickname: { type: 'string', required: false, input: false },
			isAdmin: { type: 'boolean', required: false, defaultValue: false, input: false },
			curriculumId: { type: 'number', required: false },
			policyViewed: { type: 'boolean', required: false, defaultValue: false, input: false },
		},
	},

	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					// Defence-in-depth: only allow KMITL accounts.
					if (!user.email.toLowerCase().endsWith(`@${KMITL_EMAIL_DOMAIN}`)) {
						throw new APIError('BAD_REQUEST', {
							message: `Only @${KMITL_EMAIL_DOMAIN} accounts are allowed`,
						})
					}
					return { data: user }
				},
			},
		},
	},

	plugins: [
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
								const email = (profile.email ?? '').toLowerCase()
								const local = email.split('@')[0] ?? ''
								const studentId = STUDENT_ID_RE.test(local)
									? local
									: (profile.preferred_username ?? undefined)
								// Extra keys are valid additionalFields; the cast satisfies the
								// generic mapProfileToUser return type (it can't infer them).
								return {
									name:
										profile.name ??
										`${profile.given_name ?? ''} ${profile.family_name ?? ''}`.trim(),
									username: studentId,
									firstName: profile.given_name,
									lastName: profile.family_name,
									nickname: profile.given_name ?? studentId,
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
