import { createServerFn } from '@tanstack/react-start'

/** Returns the KMITL SSO logout URL for the current user, or null (local-only sign out). */
export const getSsoLogoutUrl = createServerFn({ method: 'GET' }).handler(async () => {
	const { buildSsoLogoutUrl } = await import('./sso.server')
	return buildSsoLogoutUrl()
})
