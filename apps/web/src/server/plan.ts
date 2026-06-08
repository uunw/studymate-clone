import { db, eq, schema } from '@repo/db'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export type PlanSelectionItem = {
	subjectId: string
	credit: number | null
	name: string | null
	isFree: boolean
}

/** The signed-in user's saved what-if registration selection (progress tab). */
export const getMyPlanSelection = createServerFn({ method: 'GET' }).handler(
	async (): Promise<PlanSelectionItem[]> => {
		const { requireUser } = await import('./auth.server')
		const user = await requireUser()
		return db
			.select({
				subjectId: schema.planSubject.subjectId,
				credit: schema.planSubject.credit,
				name: schema.planSubject.name,
				isFree: schema.planSubject.isFree,
			})
			.from(schema.planSubject)
			.where(eq(schema.planSubject.userId, user.id))
	},
)

/** Replace the user's saved selection with the given set (empty clears it). */
export const savePlanSelection = createServerFn({ method: 'POST' })
	.inputValidator(
		z.array(
			z.object({
				subjectId: z.string(),
				credit: z.number().nullable().optional(),
				name: z.string().nullable().optional(),
				isFree: z.boolean().optional(),
			}),
		),
	)
	.handler(async ({ data }) => {
		const { requireUser } = await import('./auth.server')
		const user = await requireUser()
		await db.delete(schema.planSubject).where(eq(schema.planSubject.userId, user.id))
		if (data.length) {
			await db.insert(schema.planSubject).values(
				data.map((d) => ({
					userId: user.id,
					subjectId: d.subjectId,
					credit: d.credit ?? null,
					name: d.name ?? null,
					isFree: !!d.isFree,
				})),
			)
		}
		return { ok: true }
	})
