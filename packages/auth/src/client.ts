import { emailOTPClient, inferAdditionalFields, usernameClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import type { Auth } from './server'

/**
 * Browser auth client. baseURL defaults to the current origin, where the
 * Better Auth handler is mounted at /api/auth (see apps/web).
 */
export const authClient = createAuthClient({
	plugins: [usernameClient(), emailOTPClient(), inferAdditionalFields<Auth>()],
})

export const { signIn, signUp, signOut, useSession, getSession } = authClient
