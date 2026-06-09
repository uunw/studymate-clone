import type { SubjectFilter } from '@repo/core/schemas'
import type { Subject } from '@repo/db'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '~/lib/firebase'
import { createServerFn } from '~/lib/server-fn'

// Subjects carry denormalized fields (ratingAvg, reviewCount, searchTokens,
// offeredDays, openSections) seeded by packages/db seed-firestore.
type StoredSubject = Subject & {
	ratingAvg: number
	reviewCount: number
	searchTokens: string[]
	offeredDays: number[]
	openSections: number
}

type SubjectListItem = Pick<Subject, 'id' | 'nameTh' | 'nameEn' | 'credit'> & {
	rating: number
	reviewCount: number
	openSections: number
	ruleTh: string | null
}

/**
 * Paginated subject list. The catalog (~750 docs) is fetched once and filtered
 * client-side — Firestore has no substring search. TODO(perf): denormalized
 * query fields / a search service if the catalog grows.
 * TODO(phase 4b): curriculum-group / faculty / department filters.
 */
export const listSubjects = createServerFn({ method: 'GET' })
	.inputValidator((d: unknown) => d)
	.handler(
		async (
			ctx,
		): Promise<{
			items: SubjectListItem[]
			page: number
			pageSize: number
			total: number
			totalPages: number
		}> => {
			const data = ctx.data as SubjectFilter
			const { page, pageSize } = data
			const snap = await getDocs(collection(db, 'subjects'))
			let rows = snap.docs.map((d) => d.data() as StoredSubject)

			const q = data.q?.trim().toLowerCase()
			if (q) {
				rows = rows.filter(
					(s) =>
						s.id.toLowerCase().includes(q) ||
						(s.nameTh ?? '').toLowerCase().includes(q) ||
						(s.nameEn ?? '').toLowerCase().includes(q),
				)
			}
			if (data.openOnly === true || data.openOnly === 'true') {
				rows = rows.filter((s) => (s.openSections ?? 0) > 0)
			}
			if (data.day) rows = rows.filter((s) => (s.offeredDays ?? []).includes(data.day as number))
			if (data.minRating)
				rows = rows.filter((s) => (s.ratingAvg ?? 0) >= (data.minRating as number))

			rows.sort((a, b) => a.id.localeCompare(b.id))
			const total = rows.length
			const start = (page - 1) * pageSize
			const items = rows.slice(start, start + pageSize).map((s) => ({
				id: s.id,
				nameTh: s.nameTh,
				nameEn: s.nameEn,
				credit: s.credit,
				rating: s.ratingAvg ?? 0,
				reviewCount: s.reviewCount ?? 0,
				openSections: s.openSections ?? 0,
				ruleTh: null,
			}))
			return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
		},
	)

export const getSubject = createServerFn({ method: 'GET' })
	.inputValidator((id: string) => id)
	.handler(async (): Promise<Subject & { rating: number; reviewCount: number }> => {
		// TODO(phase 4b): Firestore doc read.
		throw new Error('NOT_FOUND')
	})

export type GroupOption = {
	id: number
	name: string | null
	type: string | null
	color: string | null
	children: GroupOption[]
}
export const listCurriculumGroupOptions = createServerFn({ method: 'GET' })
	.inputValidator((id: number) => id)
	.handler(async (): Promise<GroupOption[]> => [])

export type OfferedElective = {
	id: string
	nameTh: string | null
	nameEn: string | null
	credit: number | null
	ruleTh: string | null
	restricted: boolean
}
export const listOfferedElectives = createServerFn({ method: 'GET' })
	.inputValidator((d: unknown) => d)
	.handler(
		async (): Promise<{
			items: OfferedElective[]
			page: number
			pageSize: number
			total: number
			totalPages: number
		}> => ({ items: [], page: 1, pageSize: 8, total: 0, totalPages: 1 }),
	)

export type CurriculumElective = {
	id: string
	nameTh: string | null
	nameEn: string | null
	credit: number | null
	ruleTh: string | null
}
export const listCurriculumElectives = createServerFn({ method: 'GET' })
	.inputValidator((id: number) => id)
	.handler(async (): Promise<CurriculumElective[]> => [])

export type SubjectSchedule = {
	subjectId: string | null
	section: string | null
	day: number | null
	timeStart: string | null
	timeEnd: string | null
	examMidterm: string | null
	examFinal: string | null
	ruleTh: string | null
}
export const getSubjectSchedules = createServerFn({ method: 'GET' })
	.inputValidator((ids: string[]) => ids)
	.handler(async (): Promise<SubjectSchedule[]> => [])

export type OfferedSchedule = {
	subjectId: string
	day: number | null
	timeStart: string | null
	timeEnd: string | null
	sections: number
	capacity: number
	preCount: number
}
export const listOfferedSchedules = createServerFn({ method: 'GET' }).handler(
	async (): Promise<OfferedSchedule[]> => [],
)

export const listTeachtables = createServerFn({ method: 'GET' }).handler(
	async (): Promise<import('@repo/db').Teachtable[]> => [],
)

export const listSectionsForSubject = createServerFn({ method: 'GET' })
	.inputValidator((id: string) => id)
	.handler(
		async (): Promise<
			(Pick<
				import('@repo/db').SubjectClass,
				| 'id'
				| 'section'
				| 'lectOrPrac'
				| 'day'
				| 'timeStart'
				| 'timeEnd'
				| 'room'
				| 'building'
				| 'teacherTh'
				| 'capacity'
				| 'enrolled'
				| 'closed'
			> & { year: number | null; term: number | null })[]
		> => [],
	)
