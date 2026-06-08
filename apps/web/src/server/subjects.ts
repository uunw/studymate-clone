import { subjectFilterSchema } from '@repo/core/schemas'
import { pageBounds } from '@repo/core/utils'
import { and, asc, avg, count, db, desc, eq, schema, sql } from '@repo/db'
import { createServerFn } from '@tanstack/react-start'

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
		const where = and(qCond, openCond, dayCond, ratingCond)

		const openSections = sql<number>`(SELECT count(*)::int FROM ${schema.subjectClass} sc WHERE sc.subject_id = ${schema.subject.id} AND sc.teachtable_id = ${ttId})`

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
