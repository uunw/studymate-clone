import { profileSchema, selectCurriculumSchema } from '@repo/core/schemas'
import { db, eq, schema } from '@repo/db'
import { createServerFn } from '@tanstack/react-start'

export const updateProfile = createServerFn({ method: 'POST' })
	.inputValidator(profileSchema)
	.handler(async ({ data }) => {
		const { requireUser } = await import('./auth.server')
		const user = await requireUser()
		await db
			.update(schema.user)
			.set({
				firstName: data.firstName,
				lastName: data.lastName,
				nickname: data.nickname,
				name: `${data.firstName} ${data.lastName}`,
				updatedAt: new Date(),
			})
			.where(eq(schema.user.id, user.id))
		return { ok: true }
	})

export const selectCurriculum = createServerFn({ method: 'POST' })
	.inputValidator(selectCurriculumSchema)
	.handler(async ({ data }) => {
		const { requireUser } = await import('./auth.server')
		const user = await requireUser()
		await db
			.update(schema.user)
			.set({ curriculumId: data.curriculumId, updatedAt: new Date() })
			.where(eq(schema.user.id, user.id))
		return { ok: true }
	})

export const acceptPolicy = createServerFn({ method: 'POST' }).handler(async () => {
	const { requireUser } = await import('./auth.server')
	const user = await requireUser()
	await db
		.update(schema.user)
		.set({ policyViewed: true, updatedAt: new Date() })
		.where(eq(schema.user.id, user.id))
	return { ok: true }
})
