import { hasCondition, isSectionOpenToStudent, majorToken } from '@repo/core/eligibility'
import { subjectFilterSchema } from '@repo/core/schemas'
import { pageBounds } from '@repo/core/utils'
import { and, asc, avg, count, db, desc, eq, inArray, schema, sql } from '@repo/db'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

/** Paginated subject list with average rating, review count, and sections-offered-this-term. */
export const listSubjects = createServerFn({ method: 'GET' })
	.inputValidator(subjectFilterSchema)
	.handler(async ({ data }) => {
		const { q, page, pageSize } = data
		const openOnly = data.openOnly === true || data.openOnly === 'true'
		const like = `%${q ?? ''}%`
		const { limit, offset } = pageBounds(page, pageSize)

		// Current term = the latest teachtable.
		const [cur] = await db
			.select({ id: schema.teachtable.id })
			.from(schema.teachtable)
			.orderBy(desc(schema.teachtable.year), desc(schema.teachtable.term))
			.limit(1)
		const ttId = cur?.id ?? -1

		const qCond = q
			? sql`(${schema.subject.nameTh} ILIKE ${like} OR ${schema.subject.nameEn} ILIKE ${like} OR ${schema.subject.id} ILIKE ${like})`
			: undefined
		const openCond = openOnly
			? sql`EXISTS (SELECT 1 FROM ${schema.subjectClass} sc WHERE sc.subject_id = ${schema.subject.id} AND sc.teachtable_id = ${ttId})`
			: undefined
		// Day-of-week (any offering) and min-rating as correlated subqueries so
		// they also constrain the total count (which has no GROUP BY).
		const dayCond = data.day
			? sql`EXISTS (SELECT 1 FROM ${schema.subjectClass} sc WHERE sc.subject_id = ${schema.subject.id} AND sc.day = ${data.day})`
			: undefined
		const ratingCond = data.minRating
			? sql`(SELECT COALESCE(AVG(sr.rating), 0) FROM ${schema.subjectReview} sr WHERE sr.subject_id = ${schema.subject.id}) >= ${data.minRating}`
			: undefined
		const groupCond = data.groupIds?.length
			? sql`EXISTS (${db
					.select({ one: sql`1` })
					.from(schema.curriculumGroupSubject)
					.where(
						and(
							eq(schema.curriculumGroupSubject.subjectId, schema.subject.id),
							inArray(schema.curriculumGroupSubject.groupId, data.groupIds),
						),
					)})`
			: undefined
		// Offered by a faculty / department (via the teaching program's department).
		const facCond = data.facultyId
			? sql`EXISTS (SELECT 1 FROM ${schema.subjectClass} sc JOIN ${schema.program} p ON p.id = sc.program_id JOIN ${schema.department} d ON d.id = p.department_id WHERE sc.subject_id = ${schema.subject.id} AND sc.teachtable_id = ${ttId} AND d.faculty_id = ${data.facultyId})`
			: undefined
		const deptCond = data.departmentId
			? sql`EXISTS (SELECT 1 FROM ${schema.subjectClass} sc JOIN ${schema.program} p ON p.id = sc.program_id WHERE sc.subject_id = ${schema.subject.id} AND sc.teachtable_id = ${ttId} AND p.department_id = ${data.departmentId})`
			: undefined
		const where = and(qCond, openCond, dayCond, ratingCond, groupCond, facCond, deptCond)

		const openSections = sql<number>`(SELECT count(*)::int FROM ${schema.subjectClass} sc WHERE sc.subject_id = ${schema.subject.id} AND sc.teachtable_id = ${ttId})`
		// A representative condition (เงื่อนไข) for the offered subject, if any.
		const ruleTh = sql<
			string | null
		>`(SELECT sc.rule_th FROM ${schema.subjectClass} sc WHERE sc.subject_id = ${schema.subject.id} AND sc.teachtable_id = ${ttId} AND sc.rule_th IS NOT NULL AND sc.rule_th <> '' LIMIT 1)`

		const [rows, totalRow] = await Promise.all([
			db
				.select({
					id: schema.subject.id,
					nameTh: schema.subject.nameTh,
					nameEn: schema.subject.nameEn,
					credit: schema.subject.credit,
					rating: avg(schema.subjectReview.rating),
					reviewCount: count(schema.subjectReview.id),
					openSections: openSections.as('open_sections'),
					ruleTh: ruleTh.as('rule_th'),
				})
				.from(schema.subject)
				.leftJoin(schema.subjectReview, eq(schema.subjectReview.subjectId, schema.subject.id))
				.where(where)
				.groupBy(schema.subject.id)
				.orderBy(schema.subject.id)
				.limit(limit)
				.offset(offset),
			db.select({ total: count() }).from(schema.subject).where(where),
		])

		const total = totalRow[0]?.total ?? 0
		return {
			items: rows.map((r) => ({
				...r,
				rating: r.rating ? Number(r.rating) : 0,
				openSections: Number(r.openSections ?? 0),
			})),
			page,
			pageSize,
			total,
			totalPages: Math.max(1, Math.ceil(total / pageSize)),
		}
	})

/** Single subject with aggregate rating + review count. */
export const getSubject = createServerFn({ method: 'GET' })
	.inputValidator((id: string) => id)
	.handler(async ({ data: id }) => {
		const [subject] = await db
			.select()
			.from(schema.subject)
			.where(eq(schema.subject.id, id))
			.limit(1)
		if (!subject) throw new Error('NOT_FOUND')

		const [agg] = await db
			.select({
				rating: avg(schema.subjectReview.rating),
				reviewCount: count(schema.subjectReview.id),
			})
			.from(schema.subjectReview)
			.where(eq(schema.subjectReview.subjectId, id))

		return {
			...subject,
			rating: agg?.rating ? Number(agg.rating) : 0,
			reviewCount: agg?.reviewCount ?? 0,
		}
	})

export type GroupOption = {
	id: number
	name: string | null
	type: string | null
	color: string | null
	children: GroupOption[]
}

/** A curriculum's group tree (top categories + descendants) for the browse-page
 *  checkbox filter. Public; no subjects, just labels for selecting group ids. */
export const listCurriculumGroupOptions = createServerFn({ method: 'GET' })
	.inputValidator((curriculumId: number) => curriculumId)
	.handler(async ({ data: curriculumId }): Promise<GroupOption[]> => {
		const [cur] = await db
			.select({ groupId: schema.curriculum.groupId })
			.from(schema.curriculum)
			.where(eq(schema.curriculum.id, curriculumId))
			.limit(1)
		if (!cur?.groupId) return []

		const rows: (typeof schema.curriculumGroup.$inferSelect)[] = []
		const [root] = await db
			.select()
			.from(schema.curriculumGroup)
			.where(eq(schema.curriculumGroup.id, cur.groupId))
			.limit(1)
		if (!root) return []
		rows.push(root)
		let frontier = [root.id]
		while (frontier.length) {
			const children = await db
				.select()
				.from(schema.curriculumGroup)
				.where(inArray(schema.curriculumGroup.parentId, frontier))
			if (!children.length) break
			rows.push(...children)
			frontier = children.map((c) => c.id)
		}

		const childrenByParent = new Map<number, typeof rows>()
		for (const r of rows) {
			if (r.parentId == null) continue
			const list = childrenByParent.get(r.parentId) ?? []
			list.push(r)
			childrenByParent.set(r.parentId, list)
		}
		for (const list of childrenByParent.values()) list.sort((a, b) => a.id - b.id)

		const build = (r: (typeof rows)[number]): GroupOption => ({
			id: r.id,
			name: r.name,
			type: r.type,
			color: r.color,
			children: (childrenByParent.get(r.id) ?? []).map(build),
		})
		// Drop the single curriculum-root wrapper; return its top categories.
		return (childrenByParent.get(root.id) ?? []).map(build)
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
 * Subjects offered this term for the free-elective picker, with each subject's
 * registration condition (เงื่อนไข). By default subjects the signed-in student
 * can't register for — restricted to a student-id range/set that excludes them —
 * are hidden; `includeRestricted` shows them. Filterable by faculty/department.
 */
export const listOfferedElectives = createServerFn({ method: 'GET' })
	.inputValidator(
		z.object({
			q: z.string().trim().optional(),
			facultyId: z.coerce.number().int().positive().optional(),
			departmentId: z.coerce.number().int().positive().optional(),
			includeRestricted: z.boolean().optional(),
			page: z.coerce.number().int().min(1).default(1),
			pageSize: z.coerce.number().int().min(1).max(50).default(8),
		}),
	)
	.handler(async ({ data }) => {
		const { readUser } = await import('./auth.server')
		const user = await readUser()
		const studentId = Number(user?.username ?? Number.NaN)

		// Student's major token + faculty, for matching "เฉพาะสาขา/คณะ" conditions.
		let ctx: { major?: string; faculty?: string } = {}
		if (user?.curriculumId) {
			const [info] = await db
				.select({
					progName: schema.program.nameTh,
					deptName: schema.department.nameTh,
					facName: schema.faculty.nameTh,
				})
				.from(schema.curriculum)
				.leftJoin(schema.program, eq(schema.program.id, schema.curriculum.programId))
				.leftJoin(schema.department, eq(schema.department.id, schema.program.departmentId))
				.leftJoin(schema.faculty, eq(schema.faculty.id, schema.department.facultyId))
				.where(eq(schema.curriculum.id, user.curriculumId))
				.limit(1)
			if (info) {
				ctx = {
					major: majorToken(info.progName) || majorToken(info.deptName) || undefined,
					faculty: info.facName ?? undefined,
				}
			}
		}

		const [cur] = await db
			.select({ id: schema.teachtable.id })
			.from(schema.teachtable)
			.orderBy(desc(schema.teachtable.year), desc(schema.teachtable.term))
			.limit(1)
		const ttId = cur?.id ?? -1

		const like = `%${data.q ?? ''}%`
		const conds = [eq(schema.subjectClass.teachtableId, ttId)]
		if (data.q) {
			conds.push(
				sql`(${schema.subject.nameTh} ILIKE ${like} OR ${schema.subject.nameEn} ILIKE ${like} OR ${schema.subject.id} ILIKE ${like})`,
			)
		}
		if (data.departmentId) {
			conds.push(
				sql`EXISTS (SELECT 1 FROM ${schema.program} p WHERE p.id = ${schema.subjectClass.programId} AND p.department_id = ${data.departmentId})`,
			)
		}
		if (data.facultyId) {
			conds.push(
				sql`EXISTS (SELECT 1 FROM ${schema.program} p JOIN ${schema.department} d ON d.id = p.department_id WHERE p.id = ${schema.subjectClass.programId} AND d.faculty_id = ${data.facultyId})`,
			)
		}

		const rows = await db
			.select({
				id: schema.subject.id,
				nameTh: schema.subject.nameTh,
				nameEn: schema.subject.nameEn,
				credit: schema.subject.credit,
				ruleTh: schema.subjectClass.ruleTh,
			})
			.from(schema.subjectClass)
			.innerJoin(schema.subject, eq(schema.subject.id, schema.subjectClass.subjectId))
			.where(and(...conds))

		// Group sections by subject. A subject is eligible if ANY section admits the
		// student; its shown เงื่อนไข is taken from a section the student can use
		// (prefer a clean, condition-free one — that's the section they'd register).
		const bySubj = new Map<string, OfferedElective & { open: boolean; chosen: boolean }>()
		for (const r of rows) {
			const open = isSectionOpenToStudent(r.ruleTh, studentId, ctx)
			let e = bySubj.get(r.id)
			if (!e) {
				e = {
					id: r.id,
					nameTh: r.nameTh,
					nameEn: r.nameEn,
					credit: r.credit,
					ruleTh: null,
					restricted: false,
					open: false,
					chosen: false,
				}
				bySubj.set(r.id, e)
			}
			if (open) {
				e.open = true
				if (!hasCondition(r.ruleTh)) {
					e.ruleTh = null
					e.chosen = true
				} else if (!e.chosen) {
					e.ruleTh = r.ruleTh
				}
			}
		}
		for (const e of bySubj.values()) e.restricted = !!e.ruleTh

		const hideRestricted = !data.includeRestricted && Number.isFinite(studentId)
		const all = [...bySubj.values()]
			.filter((s) => (hideRestricted ? s.open : true))
			.sort((a, b) => a.id.localeCompare(b.id))

		const total = all.length
		const start = (data.page - 1) * data.pageSize
		const items: OfferedElective[] = all
			.slice(start, start + data.pageSize)
			.map(({ open: _open, chosen: _chosen, ...s }) => s)
		return {
			items,
			page: data.page,
			pageSize: data.pageSize,
			total,
			totalPages: Math.max(1, Math.ceil(total / data.pageSize)),
		}
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

/** Representative section schedule (this term) for each subject — for clash
 *  detection. One section per subject (first by section). */
export const getSubjectSchedules = createServerFn({ method: 'GET' })
	.inputValidator((subjectIds: string[]) => subjectIds)
	.handler(async ({ data: subjectIds }): Promise<SubjectSchedule[]> => {
		if (!subjectIds.length) return []
		const [cur] = await db
			.select({ id: schema.teachtable.id })
			.from(schema.teachtable)
			.orderBy(desc(schema.teachtable.year), desc(schema.teachtable.term))
			.limit(1)
		const ttId = cur?.id ?? -1

		const rows = await db
			.select({
				subjectId: schema.subjectClass.subjectId,
				section: schema.subjectClass.section,
				day: schema.subjectClass.day,
				timeStart: schema.subjectClass.timeStart,
				timeEnd: schema.subjectClass.timeEnd,
				examMidterm: schema.subjectClass.examMidterm,
				examFinal: schema.subjectClass.examFinal,
				ruleTh: schema.subjectClass.ruleTh,
			})
			.from(schema.subjectClass)
			.where(
				and(
					inArray(schema.subjectClass.subjectId, subjectIds),
					eq(schema.subjectClass.teachtableId, ttId),
				),
			)
			.orderBy(schema.subjectClass.subjectId, schema.subjectClass.section)

		const bySubj = new Map<string, SubjectSchedule>()
		for (const r of rows) if (r.subjectId && !bySubj.has(r.subjectId)) bySubj.set(r.subjectId, r)
		return [...bySubj.values()]
	})

export const listTeachtables = createServerFn({ method: 'GET' }).handler(async () => {
	return db
		.select()
		.from(schema.teachtable)
		.orderBy(desc(schema.teachtable.year), desc(schema.teachtable.term))
})

/** Teach-table sections (offerings) for a subject, newest term first. */
export const listSectionsForSubject = createServerFn({ method: 'GET' })
	.inputValidator((subjectId: string) => subjectId)
	.handler(async ({ data: subjectId }) => {
		return db
			.select({
				id: schema.subjectClass.id,
				section: schema.subjectClass.section,
				lectOrPrac: schema.subjectClass.lectOrPrac,
				day: schema.subjectClass.day,
				timeStart: schema.subjectClass.timeStart,
				timeEnd: schema.subjectClass.timeEnd,
				room: schema.subjectClass.room,
				building: schema.subjectClass.building,
				teacherTh: schema.subjectClass.teacherTh,
				capacity: schema.subjectClass.capacity,
				enrolled: schema.subjectClass.enrolled,
				closed: schema.subjectClass.closed,
				year: schema.teachtable.year,
				term: schema.teachtable.term,
			})
			.from(schema.subjectClass)
			.leftJoin(schema.teachtable, eq(schema.teachtable.id, schema.subjectClass.teachtableId))
			.where(eq(schema.subjectClass.subjectId, subjectId))
			.orderBy(
				desc(schema.teachtable.year),
				desc(schema.teachtable.term),
				asc(schema.subjectClass.section),
			)
	})
