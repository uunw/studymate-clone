import { createServerFn } from '~/lib/server-fn'

// Firebase Google auth has no SSO logout URL; kept as a no-op for callers.
export const getSsoLogoutUrl = createServerFn({ method: 'GET' }).handler(
	async (): Promise<string | null> => null,
)
