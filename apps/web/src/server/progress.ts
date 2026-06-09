import type { ProgressGroupInput } from '@repo/core/progress'
import type { Curriculum } from '@repo/db'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '~/lib/firebase'
import { createServerFn } from '~/lib/server-fn'
import { getSessionUser } from './session'

export type CurriculumTree = {
	curriculum: { id: number; nameTh: string | null; nameEn: string | null; year: number | null }
	root: ProgressGroupInput
}

// curricula/{id}.tree is denormalized by seed-firestore as a ProgressGroupInput
// tree (each group's subjects carry credit), so this is one doc read. The
// transcript is fetched separately (getMyTranscript) and matched client-side, so
// the grade-tracker what-if recompute stays local.
export const getMyCurriculumTree = createServerFn({ method: 'GET' }).handler(
	async (): Promise<CurriculumTree | null> => {
		const user = await getSessionUser()
		if (!user?.curriculumId) return null
		const snap = await getDoc(doc(db, 'curricula', String(user.curriculumId)))
		if (!snap.exists()) return null
		const c = snap.data() as Curriculum & { tree?: ProgressGroupInput | null }
		if (!c.tree) return null
		return {
			curriculum: { id: c.id, nameTh: c.nameTh, nameEn: c.nameEn, year: c.year },
			root: c.tree,
		}
	},
)
