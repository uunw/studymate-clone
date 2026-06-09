import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '~/lib/firebase'
import { createServerFn } from '~/lib/server-fn'
import { currentUid, requireUid } from './session'

export type PlanSelectionItem = {
	subjectId: string
	credit: number | null
	name: string | null
	isFree: boolean
}

// The saved what-if selection is small + replaced wholesale, so it lives as one
// doc (items array) at users/{uid}/private/plan rather than a subcollection.
export const getMyPlanSelection = createServerFn({ method: 'GET' }).handler(
	async (): Promise<PlanSelectionItem[]> => {
		const uid = currentUid()
		if (!uid) return []
		const snap = await getDoc(doc(db, 'users', uid, 'private', 'plan'))
		return snap.exists() ? ((snap.data().items as PlanSelectionItem[]) ?? []) : []
	},
)

export const savePlanSelection = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (ctx): Promise<{ ok: true }> => {
		const input = (ctx.data as Partial<PlanSelectionItem>[]) ?? []
		const items: PlanSelectionItem[] = input.map((d) => ({
			subjectId: String(d.subjectId),
			credit: d.credit ?? null,
			name: d.name ?? null,
			isFree: !!d.isFree,
		}))
		await setDoc(doc(db, 'users', requireUid(), 'private', 'plan'), {
			items,
			updatedAt: serverTimestamp(),
		})
		return { ok: true }
	})
