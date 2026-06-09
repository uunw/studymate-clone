import { createServerFn } from '~/lib/server-fn'

export type PlanSelectionItem = {
	subjectId: string
	credit: number | null
	name: string | null
	isFree: boolean
}

// TODO(phase 4): Firestore users/{uid}/plan.
export const getMyPlanSelection = createServerFn({ method: 'GET' }).handler(
	async (): Promise<PlanSelectionItem[]> => [],
)

export const savePlanSelection = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (): Promise<{ ok: true }> => ({ ok: true }))
