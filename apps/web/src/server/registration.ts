import { doc, getDoc } from 'firebase/firestore'
import type { Detail } from '~/components/my-subjects-types'
import { db } from '~/lib/firebase'
import { createServerFn } from '~/lib/server-fn'
import { getSessionUser } from './session'

export type PlanItem = {
	subjectId: string
	section: string | null
	nameTh: string | null
	nameEn: string | null
	credit: number | null
	groupName: string | null
	taken: boolean
}

export type RegistrationPlan = {
	studentId: string
	items: PlanItem[]
	totalCredit: number
	error: 'INVALID_ID' | 'FETCH_FAILED' | null
}

const REGIS_API = 'https://regis.reg.kmitl.ac.th/api/'

type TreeNode = { name: string; subjects: { id: string }[]; children: TreeNode[] }

/**
 * The KMITL registrar's pre-registration plan for a student (get-pattern-subject,
 * keyed by the 8-digit id; the registrar API reflects CORS so the SPA fetches it
 * directly). Enriched with local credit + the user's curriculum-group name +
 * whether each subject is already on their transcript.
 */
export const getRegistrationPlan = createServerFn({ method: 'GET' })
	.inputValidator((studentId?: string) => studentId ?? '')
	.handler(async (ctx): Promise<RegistrationPlan> => {
		const user = await getSessionUser()
		const studentId = ((ctx.data as string) || user?.username || '').trim()
		if (!/^\d{8}$/.test(studentId)) {
			return { studentId, items: [], totalCredit: 0, error: 'INVALID_ID' }
		}

		type Raw = {
			subject_id: string
			section?: string
			subject_tname?: string
			subject_ename?: string
		}
		let raw: Raw[] = []
		try {
			const res = await fetch(`${REGIS_API}?function=get-pattern-subject&student_id=${studentId}`, {
				signal: AbortSignal.timeout(8000),
			})
			const json = await res.json()
			if (Array.isArray(json)) raw = json as Raw[]
		} catch {
			return { studentId, items: [], totalCredit: 0, error: 'FETCH_FAILED' }
		}
		if (!raw.length) return { studentId, items: [], totalCredit: 0, error: null }

		const ids = [...new Set(raw.map((r) => r.subject_id).filter(Boolean))]

		// Local catalog enrichment (nameTh + credit).
		const local = new Map<string, { nameTh: string | null; credit: number | null }>()
		await Promise.all(
			ids.map(async (id) => {
				const s = await getDoc(doc(db, 'subjects', id))
				if (s.exists()) {
					const v = s.data()
					local.set(id, { nameTh: v.nameTh ?? null, credit: v.credit ?? null })
				}
			}),
		)

		// Which of the user's curriculum groups each recommended subject belongs to.
		const groupName = new Map<string, string>()
		if (user?.curriculumId) {
			const cSnap = await getDoc(doc(db, 'curricula', String(user.curriculumId)))
			const tree = cSnap.exists() ? (cSnap.data() as { tree?: TreeNode | null }).tree : null
			const walk = (n: TreeNode) => {
				for (const s of n.subjects)
					if (ids.includes(s.id) && !groupName.has(s.id)) groupName.set(s.id, n.name)
				for (const c of n.children) walk(c)
			}
			if (tree) walk(tree)
		}

		// Subjects already on the user's transcript (so we don't double-recommend).
		const taken = new Set<string>()
		if (user) {
			const tSnap = await getDoc(doc(db, 'users', user.id, 'private', 'transcript'))
			if (tSnap.exists())
				for (const d of (tSnap.data().details as Detail[]) ?? [])
					if (d.subjectId) taken.add(d.subjectId)
		}

		const items: PlanItem[] = raw.map((r) => {
			const l = local.get(r.subject_id)
			return {
				subjectId: r.subject_id,
				section: r.section ?? null,
				nameTh: l?.nameTh ?? r.subject_tname ?? null,
				nameEn: r.subject_ename ?? null,
				credit: l?.credit ?? null,
				groupName: groupName.get(r.subject_id) ?? null,
				taken: taken.has(r.subject_id),
			}
		})
		const totalCredit = items.reduce((s, i) => s + (i.taken ? 0 : (i.credit ?? 0)), 0)
		return { studentId, items, totalCredit, error: null }
	})
