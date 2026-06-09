import type { SubjectFilter } from '@repo/core/schemas'
import type { Subject, SubjectClass, Teachtable } from '@repo/db'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
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

async function allSections(): Promise<SubjectClass[]> {
	const snap = await getDocs(collection(db, 'sections'))
	return snap.docs.map((d) => d.data() as SubjectClass)
}
async function teachtables(): Promise<Teachtable[]> {
	const snap = await getDocs(collection(db, 'teachtables'))
	return snap.docs.map((d) => d.data() as Teachtable)
}
function currentTtId(tts: Teachtable[]): number {
	return [...tts].sort((a, b) => b.year - a.year || b.term - a.term)[0]?.id ?? -1
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
	.handler(async (ctx): Promise<Subject & { rating: number; reviewCount: number }> => {
		const snap = await getDoc(doc(db, 'subjects', ctx.data as string))
		if (!snap.exists()) throw new Error('NOT_FOUND')
		const s = snap.data() as StoredSubject
		return { ...s, rating: s.ratingAvg ?? 0, reviewCount: s.reviewCount ?? 0 }
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
/** Representative (first) current-term section per subject — for clash detection. */
export const getSubjectSchedules = createServerFn({ method: 'GET' })
	.inputValidator((ids: string[]) => ids)
	.handler(async (ctx): Promise<SubjectSchedule[]> => {
		const ids = (ctx.data as string[]) ?? []
		if (!ids.length) return []
		const [secs, tts] = await Promise.all([allSections(), teachtables()])
		const ttId = currentTtId(tts)
		const bySubj = new Map<string, SubjectSchedule>()
		for (const sc of secs) {
			if (sc.teachtableId !== ttId || !sc.subjectId || !ids.includes(sc.subjectId)) continue
			if (bySubj.has(sc.subjectId)) continue
			bySubj.set(sc.subjectId, {
				subjectId: sc.subjectId,
				section: sc.section,
				day: sc.day,
				timeStart: sc.timeStart,
				timeEnd: sc.timeEnd,
				examMidterm: sc.examMidterm,
				examFinal: sc.examFinal,
				ruleTh: sc.ruleTh,
			})
		}
		return [...bySubj.values()]
	})

export type OfferedSchedule = {
	subjectId: string
	day: number | null
	timeStart: string | null
	timeEnd: string | null
	sections: number
	capacity: number
	preCount: number
}
/** Current-term offerings per subject (รวม sections) — for the "เปิดสอน" badge. */
export const listOfferedSchedules = createServerFn({ method: 'GET' }).handler(
	async (): Promise<OfferedSchedule[]> => {
		const [secs, tts] = await Promise.all([allSections(), teachtables()])
		const ttId = currentTtId(tts)
		const bySubj = new Map<string, OfferedSchedule>()
		for (const sc of secs) {
			if (sc.teachtableId !== ttId || !sc.subjectId) continue
			const e = bySubj.get(sc.subjectId)
			if (!e) {
				bySubj.set(sc.subjectId, {
					subjectId: sc.subjectId,
					day: sc.day,
					timeStart: sc.timeStart,
					timeEnd: sc.timeEnd,
					sections: 1,
					capacity: sc.capacity ?? 0,
					preCount: sc.preCount ?? 0,
				})
			} else {
				e.sections++
				e.capacity += sc.capacity ?? 0
				e.preCount += sc.preCount ?? 0
			}
		}
		return [...bySubj.values()]
	},
)

export const listTeachtables = createServerFn({ method: 'GET' }).handler(
	async (): Promise<Teachtable[]> =>
		(await teachtables()).sort((a, b) => b.year - a.year || b.term - a.term),
)

type Section = Pick<
	SubjectClass,
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
> & { year: number | null; term: number | null }
/** Teach-table sections (offerings) for a subject, newest term first. */
export const listSectionsForSubject = createServerFn({ method: 'GET' })
	.inputValidator((id: string) => id)
	.handler(async (ctx): Promise<Section[]> => {
		const subjectId = ctx.data as string
		const [secSnap, tts] = await Promise.all([
			getDocs(query(collection(db, 'sections'), where('subjectId', '==', subjectId))),
			teachtables(),
		])
		const ttById = new Map(tts.map((t) => [t.id, t]))
		return secSnap.docs
			.map((d) => d.data() as SubjectClass)
			.map((sc) => {
				const tt = sc.teachtableId == null ? undefined : ttById.get(sc.teachtableId)
				return {
					id: sc.id,
					section: sc.section,
					lectOrPrac: sc.lectOrPrac,
					day: sc.day,
					timeStart: sc.timeStart,
					timeEnd: sc.timeEnd,
					room: sc.room,
					building: sc.building,
					teacherTh: sc.teacherTh,
					capacity: sc.capacity,
					enrolled: sc.enrolled,
					closed: sc.closed,
					year: tt?.year ?? null,
					term: tt?.term ?? null,
				}
			})
			.sort(
				(a, b) =>
					(b.year ?? 0) - (a.year ?? 0) ||
					(b.term ?? 0) - (a.term ?? 0) ||
					(a.section ?? '').localeCompare(b.section ?? ''),
			)
	})
