import {
	genericOAuthClient,
	inferAdditionalFields,
	usernameClient,
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import type { Auth } from './server'

/**
 * Browser auth client. baseURL defaults to the current origin, where the
 * Better Auth handler is mounted at /api/auth (see apps/web).
 *
 * Login:
 *   authClient.signIn.email({ email, password })       // email + password
 *   authClient.signIn.username({ username, password })  // student-id login
 *   authClient.signIn.oauth2({ providerId: 'kmitl' })   // KMITL SSO (when provisioned)
 */
export const authClient = createAuthClient({
	plugins: [usernameClient(), genericOAuthClient(), inferAdditionalFields<Auth>()],
})

export const { signIn, signUp, signOut, useSession, getSession } = authClient
