import { profileSchema, selectCurriculumSchema } from '@repo/core/schemas'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '~/lib/firebase'
import { createServerFn } from '~/lib/server-fn'
import { requireUid } from './session'

// User profile lives at users/{uid} (owner-only per firestore.rules). setDoc
// merge so the first write creates the doc. isAdmin is NOT written here — it
// comes from the admins/{uid} marker, which clients can't write.
const userRef = () => doc(db, 'users', requireUid())

export const updateProfile = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (ctx): Promise<{ ok: true }> => {
		const data = profileSchema.parse(ctx.data)
		await setDoc(
			userRef(),
			{
				firstName: data.firstName,
				lastName: data.lastName,
				nickname: data.nickname,
				name: `${data.firstName} ${data.lastName}`,
				updatedAt: serverTimestamp(),
			},
			{ merge: true },
		)
		return { ok: true }
	})

export const updateAvatar = createServerFn({ method: 'POST' })
	.inputValidator((image: string) => image)
	.handler(async (ctx): Promise<{ ok: true }> => {
		await setDoc(
			userRef(),
			{ image: ctx.data as string, updatedAt: serverTimestamp() },
			{ merge: true },
		)
		return { ok: true }
	})

export const selectCurriculum = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (ctx): Promise<{ ok: true }> => {
		const data = selectCurriculumSchema.parse(ctx.data)
		await setDoc(
			userRef(),
			{ curriculumId: data.curriculumId, updatedAt: serverTimestamp() },
			{ merge: true },
		)
		return { ok: true }
	})

export const acceptPolicy = createServerFn({ method: 'POST' }).handler(
	async (): Promise<{ ok: true }> => {
		await setDoc(userRef(), { policyViewed: true, updatedAt: serverTimestamp() }, { merge: true })
		return { ok: true }
	},
)
