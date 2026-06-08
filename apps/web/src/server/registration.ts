import { db, desc, eq, inArray, schema } from '@repo/db'
import { createServerFn } from '@tanstack/react-start'

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

/**
 * The KMITL registrar's pre-registration plan for a student: the subjects the
 * curriculum recommends taking the upcoming term. Public registrar endpoint
 * (`get-pattern-subject`, keyed by 8-digit student id, no auth, uses the active
 * pre-reg term). We enrich each subject with local credit + curriculum-group +
 * whether it's already on the user's transcript.
 */
export const getRegistrationPlan = createServerFn({ method: 'GET' })
	.inputValidator((studentId?: string) => studentId ?? '')
	.handler(async ({ data }): Promise<RegistrationPlan> => {
		const { requireUser } = await import('./auth.server')
		const user = await requireUser()
		const studentId = (data || user.username || '').trim()
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
		const subs = ids.length
			? await db
					.select({
						id: schema.subject.id,
						nameTh: schema.subject.nameTh,
						credit: schema.subject.credit,
					})
					.from(schema.subject)
					.where(inArray(schema.subject.id, ids))
			: []
		const local = new Map(subs.map((s) => [s.id, s]))

		// Which of the user's curriculum groups each recommended subject belongs to.
		const groupName = new Map<string, string>()
		if (user.curriculumId) {
			const [cur] = await db
				.select({ groupId: schema.curriculum.groupId })
				.from(schema.curriculum)
				.where(eq(schema.curriculum.id, user.curriculumId))
				.limit(1)
			if (cur?.groupId) {
				const groupIds = [cur.groupId]
				let frontier = [cur.groupId]
				while (frontier.length) {
					const children = await db
						.select({ id: schema.curriculumGroup.id })
						.from(schema.curriculumGroup)
						.where(inArray(schema.curriculumGroup.parentId, frontier))
					if (!children.length) break
					const cids = children.map((c) => c.id)
					groupIds.push(...cids)
					frontier = cids
				}
				const [names, links] = await Promise.all([
					db
						.select({ id: schema.curriculumGroup.id, name: schema.curriculumGroup.name })
						.from(schema.curriculumGroup)
						.where(inArray(schema.curriculumGroup.id, groupIds)),
					db
						.select({
							subjectId: schema.curriculumGroupSubject.subjectId,
							groupId: schema.curriculumGroupSubject.groupId,
						})
						.from(schema.curriculumGroupSubject)
						.where(inArray(schema.curriculumGroupSubject.groupId, groupIds)),
				])
				const nameById = new Map(names.map((n) => [n.id, n.name]))
				for (const l of links) {
					if (ids.includes(l.subjectId) && !groupName.has(l.subjectId)) {
						const n = nameById.get(l.groupId)
						if (n) groupName.set(l.subjectId, n)
					}
				}
			}
		}

		// Subjects already on the user's transcript (so we don't double-recommend).
		const taken = new Set<string>()
		const [transcript] = await db
			.select({ id: schema.transcript.id })
			.from(schema.transcript)
			.where(eq(schema.transcript.userId, user.id))
			.orderBy(desc(schema.transcript.createdAt))
			.limit(1)
		if (transcript) {
			const det = await db
				.select({ s: schema.transcriptDetail.subjectId })
				.from(schema.transcriptDetail)
				.where(eq(schema.transcriptDetail.transcriptId, transcript.id))
			for (const d of det) if (d.s) taken.add(d.s)
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
