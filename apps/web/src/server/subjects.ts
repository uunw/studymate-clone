import { subjectFilterSchema } from '@repo/core/schemas'
import { pageBounds } from '@repo/core/utils'
import { avg, count, db, desc, eq, schema, sql } from '@repo/db'
import { createServerFn } from '@tanstack/react-start'

/** Paginated subject list with average rating + review count. */
export const listSubjects = createServerFn({ method: 'GET' })
	.inputValidator(subjectFilterSchema)
	.handler(async ({ data }) => {
		const { q, page, pageSize } = data
		const like = `%${q ?? ''}%`
		const where = q
			? sql`(${schema.subject.nameTh} ILIKE ${like} OR ${schema.subject.nameEn} ILIKE ${like} OR ${schema.subject.id} ILIKE ${like})`
			: undefined
		const { limit, offset } = pageBounds(page, pageSize)

		const [rows, totalRow] = await Promise.all([
			db
				.select({
					id: schema.subject.id,
					nameTh: schema.subject.nameTh,
					nameEn: schema.subject.nameEn,
					credit: schema.subject.credit,
					rating: avg(schema.subjectReview.rating),
					reviewCount: count(schema.subjectReview.id),
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
