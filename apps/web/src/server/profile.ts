import { createServerFn } from '~/lib/server-fn'

// TODO(phase 4): persist to Firestore users/{uid}. No-ops for now.
export const updateProfile = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (): Promise<{ ok: true }> => ({ ok: true }))

export const updateAvatar = createServerFn({ method: 'POST' })
	.inputValidator((image: string) => image)
	.handler(async (): Promise<{ ok: true }> => ({ ok: true }))

export const selectCurriculum = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (): Promise<{ ok: true }> => ({ ok: true }))

export const acceptPolicy = createServerFn({ method: 'POST' }).handler(
	async (): Promise<{ ok: true }> => ({ ok: true }),
)
