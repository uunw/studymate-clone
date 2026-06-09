import { hasCondition, isSectionOpenToStudent, majorToken } from '@repo/core/eligibility'
import type { SubjectFilter } from '@repo/core/schemas'
import type {
	Curriculum,
	Department,
	Faculty,
	Program,
	Subject,
	SubjectClass,
	Teachtable,
} from '@repo/db'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '~/lib/firebase'
import { createServerFn } from '~/lib/server-fn'
import { getSessionUser } from './session'

// Subjects carry denormalized fields (ratingAvg, reviewCount, searchTokens,
// offeredDays, openSections) seeded by packages/db seed-firestore.
type StoredSubject = Subject & {
	ratingAvg: number
	reviewCount: number
	searchTokens: string[]
	offeredDays: number[]
	openSections: number
}

// Denormalized group-tree node (curricula/{id}.tree), see seed-firestore.
type StoredTreeNode = {
	id: number
	name: string
	type: string | null
	credit: number | null
	color: string | null
	acceptPrefix: string | null
	subjects: { id: string; credit: number; nameTh: string | null; nameEn: string | null }[]
	children: StoredTreeNode[]
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
// Top categories of a curriculum's group tree (the curriculum-root wrapper
// dropped) — the picker's group dropdown. From curricula/{id}.tree.
export const listCurriculumGroupOptions = createServerFn({ method: 'GET' })
	.inputValidator((id: number) => id)
	.handler(async (ctx): Promise<GroupOption[]> => {
		const snap = await getDoc(doc(db, 'curricula', String(ctx.data as number)))
		if (!snap.exists()) return []
		const tree = (snap.data() as { tree?: StoredTreeNode | null }).tree
		if (!tree) return []
		const toOption = (n: StoredTreeNode): GroupOption => ({
			id: n.id,
			name: n.name,
			type: n.type,
			color: n.color,
			children: n.children.map(toOption),
		})
		return tree.children.map(toOption)
	})

export type OfferedElective = {
	id: string
	nameTh: string | null
	nameEn: string | null
	credit: number | null
	ruleTh: string | null
	restricted: boolean
}
/**
 * Subjects offered this term for the free-elective picker, each with its
 * registration condition (เงื่อนไข). A subject is eligible if ANY section admits
 * the signed-in student; restricted ones (student-id range excludes them) are
 * hidden unless includeRestricted. Pure Firestore (current-term sections +
 * catalog + program/department/faculty maps for the filters + student context).
 */
export const listOfferedElectives = createServerFn({ method: 'GET' })
	.inputValidator((d: unknown) => d)
	.handler(
		async (
			ctx,
		): Promise<{
			items: OfferedElective[]
			page: number
			pageSize: number
			total: number
			totalPages: number
		}> => {
			const data = (ctx.data ?? {}) as {
				q?: string
				facultyId?: number
				departmentId?: number
				includeRestricted?: boolean
				page?: number
				pageSize?: number
			}
			const page = data.page ?? 1
			const pageSize = data.pageSize ?? 8
			const user = await getSessionUser()
			const studentId = Number(user?.username ?? Number.NaN)

			const [secs, tts, subjSnap, progSnap, deptSnap, facSnap] = await Promise.all([
				allSections(),
				teachtables(),
				getDocs(collection(db, 'subjects')),
				getDocs(collection(db, 'programs')),
				getDocs(collection(db, 'departments')),
				getDocs(collection(db, 'faculties')),
			])
			const ttId = currentTtId(tts)
			const subjById = new Map(subjSnap.docs.map((d) => [d.id, d.data() as Subject]))
			const programs = new Map(
				progSnap.docs.map((d) => [(d.data() as Program).id, d.data() as Program]),
			)
			const departments = new Map(
				deptSnap.docs.map((d) => [(d.data() as Department).id, d.data() as Department]),
			)
			const faculties = new Map(
				facSnap.docs.map((d) => [(d.data() as Faculty).id, d.data() as Faculty]),
			)

			// Student context (major token + faculty) for "เฉพาะสาขา/คณะ" conditions.
			let elig: { major?: string; faculty?: string } = {}
			if (user?.curriculumId) {
				const cSnap = await getDoc(doc(db, 'curricula', String(user.curriculumId)))
				const prog = cSnap.exists()
					? programs.get((cSnap.data() as Curriculum).programId ?? -1)
					: undefined
				const dept = prog ? departments.get(prog.departmentId ?? -1) : undefined
				const fac = dept ? faculties.get(dept.facultyId ?? -1) : undefined
				elig = {
					major: majorToken(prog?.nameTh) || majorToken(dept?.nameTh) || undefined,
					faculty: fac?.nameTh ?? undefined,
				}
			}

			const facultyOf = (programId: number | null) => {
				if (programId == null) return null
				const dId = programs.get(programId)?.departmentId ?? null
				return dId == null ? null : (departments.get(dId)?.facultyId ?? null)
			}
			const q = data.q?.trim().toLowerCase()

			type Acc = OfferedElective & { open: boolean; chosen: boolean }
			const bySubj = new Map<string, Acc>()
			for (const sc of secs) {
				if (sc.teachtableId !== ttId || !sc.subjectId) continue
				const subj = subjById.get(sc.subjectId)
				if (!subj) continue
				if (
					q &&
					!(
						subj.id.toLowerCase().includes(q) ||
						(subj.nameTh ?? '').toLowerCase().includes(q) ||
						(subj.nameEn ?? '').toLowerCase().includes(q)
					)
				)
					continue
				if (
					data.departmentId &&
					programs.get(sc.programId ?? -1)?.departmentId !== data.departmentId
				)
					continue
				if (data.facultyId && facultyOf(sc.programId) !== data.facultyId) continue

				const open = isSectionOpenToStudent(sc.ruleTh, studentId, elig)
				let e = bySubj.get(subj.id)
				if (!e) {
					e = {
						id: subj.id,
						nameTh: subj.nameTh,
						nameEn: subj.nameEn,
						credit: subj.credit,
						ruleTh: null,
						restricted: false,
						open: false,
						chosen: false,
					}
					bySubj.set(subj.id, e)
				}
				if (open) {
					e.open = true
					if (!hasCondition(sc.ruleTh)) {
						e.ruleTh = null
						e.chosen = true
					} else if (!e.chosen) {
						e.ruleTh = sc.ruleTh
					}
				}
			}
			for (const e of bySubj.values()) e.restricted = !!e.ruleTh

			const hideRestricted = !data.includeRestricted && Number.isFinite(studentId)
			const all = [...bySubj.values()]
				.filter((s) => (hideRestricted ? s.open : true))
				.sort((a, b) => a.id.localeCompare(b.id))
			const total = all.length
			const start = (page - 1) * pageSize
			const items: OfferedElective[] = all
				.slice(start, start + pageSize)
				.map(({ open: _o, chosen: _c, ...s }) => s)
			return { items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
		},
	)

export type CurriculumElective = {
	id: string
	nameTh: string | null
	nameEn: string | null
	credit: number | null
	ruleTh: string | null
}
/**
 * Free-elective options for a curriculum, straight from the registrar's curated
 * teach-table (get-teach-table-show by_class) — the "กลุ่ม 1 (GenEd/เลือกเสรี)"
 * group, already filtered by major + class-year. The registrar API reflects CORS,
 * so the SPA fetches it directly. Needs the curriculum's stored registrar codes.
 */
export const listCurriculumElectives = createServerFn({ method: 'GET' })
	.inputValidator((id: number) => id)
	.handler(async (ctx): Promise<CurriculumElective[]> => {
		const user = await getSessionUser()
		const studentId = Number(user?.username ?? Number.NaN)
		const cSnap = await getDoc(doc(db, 'curricula', String(ctx.data as number)))
		if (!cSnap.exists()) return []
		const c = cSnap.data() as Curriculum
		const rf = c.regFacultyId
		const rd = c.regDepartmentId
		const rc = c.regCurriculumId
		if (!rf || !rd || !rc) return []

		const tt = (await teachtables()).sort((a, b) => b.year - a.year || b.term - a.term)[0]
		if (!tt) return []

		const admYear = Number.isFinite(studentId)
			? 2500 + Math.floor(studentId / 1_000_000)
			: Number.NaN
		const classYear = Number.isFinite(admYear) ? Math.min(8, Math.max(1, tt.year - admYear + 1)) : 1
		const searchAllClassYear = !Number.isFinite(admYear)
		const url =
			`https://regis.reg.kmitl.ac.th/api/?function=get-teach-table-show&mode=by_class` +
			`&selected_year=${tt.year}&selected_semester=${tt.term}&selected_faculty=${rf}` +
			`&selected_department=${rd}&selected_curriculum=${rc}&selected_class_year=${classYear}` +
			`&search_all_faculty=false&search_all_department=false&search_all_curriculum=false&search_all_class_year=${searchAllClassYear}`

		type Sec = {
			subject_id: string
			subject_name_th?: string
			subject_name_en?: string
			credit?: string
			rules_th?: string
		}
		type Group = { subject_type_name_th?: string; data?: Sec[] }
		type Block = { teachtable?: Group[]; curriculum_name_th?: string; faculty_name_th?: string }
		let blocks: Record<string, Block> = {}
		try {
			const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
			blocks = (await res.json()) as Record<string, Block>
		} catch {
			return []
		}

		const stripHtml = (s?: string | null) =>
			s
				? s
						.replace(/<[^>]*>/g, ' ')
						.replace(/\s+/g, ' ')
						.trim() || null
				: null
		const num = (s?: string) => {
			const n = Number.parseInt(s ?? '', 10)
			return Number.isFinite(n) ? n : null
		}

		const first = Object.values(blocks)[0]
		const ectx = {
			major: majorToken(first?.curriculum_name_th) || undefined,
			faculty: first?.faculty_name_th ?? undefined,
		}

		const acc = new Map<string, CurriculumElective & { open: boolean; chosen: boolean }>()
		for (const block of Object.values(blocks)) {
			for (const g of block.teachtable ?? []) {
				if (!/เลือกเสรี|GenEd|ศึกษาทั่วไป/i.test(g.subject_type_name_th ?? '')) continue
				for (const s of g.data ?? []) {
					if (!s.subject_id) continue
					const rule = stripHtml(s.rules_th)
					const open = isSectionOpenToStudent(rule, studentId, ectx)
					let e = acc.get(s.subject_id)
					if (!e) {
						e = {
							id: s.subject_id,
							nameTh: s.subject_name_th ?? null,
							nameEn: s.subject_name_en ?? null,
							credit: num(s.credit),
							ruleTh: null,
							open: false,
							chosen: false,
						}
						acc.set(s.subject_id, e)
					}
					if (open) {
						e.open = true
						if (!hasCondition(rule)) {
							e.ruleTh = null
							e.chosen = true
						} else if (!e.chosen) {
							e.ruleTh = rule
						}
					}
				}
			}
		}

		const eligibleOnly = Number.isFinite(studentId)
		return [...acc.values()]
			.filter((e) => (eligibleOnly ? e.open : true))
			.sort((a, b) => a.id.localeCompare(b.id))
			.map(({ open: _o, chosen: _c, ...e }) => e)
	})

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
