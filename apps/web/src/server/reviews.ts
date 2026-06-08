import { reviewSchema } from '@repo/core/schemas'
import { and, count, db, desc, eq, inArray, schema, sql } from '@repo/db'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

/** Reviews for one subject, newest first, with author display name + like count. */
export const listReviewsForSubject = createServerFn({ method: 'GET' })
	.inputValidator((subjectId: string) => subjectId)
	.handler(async ({ data: subjectId }) => {
		return db
			.select({
				id: schema.subjectReview.id,
				review: schema.subjectReview.review,
				rating: schema.subjectReview.rating,
				likeCount: schema.subjectReview.likeCount,
				createdAt: schema.subjectReview.createdAt,
				year: schema.teachtable.year,
				term: schema.teachtable.term,
				authorNickname: schema.user.nickname,
				authorName: schema.user.name,
				authorId: schema.user.id,
			})
			.from(schema.subjectReview)
			.leftJoin(schema.user, eq(schema.user.id, schema.subjectReview.userId))
			.leftJoin(schema.teachtable, eq(schema.teachtable.id, schema.subjectReview.teachtableId))
			.where(eq(schema.subjectReview.subjectId, subjectId))
			.orderBy(desc(schema.subjectReview.createdAt), desc(schema.subjectReview.id))
	})

/** Latest reviews across all subjects (home/reviews feed). */
export const listLatestReviews = createServerFn({ method: 'GET' })
	.inputValidator((limit?: number) => limit ?? 20)
	.handler(async ({ data: limit }) => {
		return db
			.select({
				id: schema.subjectReview.id,
				review: schema.subjectReview.review,
				rating: schema.subjectReview.rating,
				likeCount: schema.subjectReview.likeCount,
				createdAt: schema.subjectReview.createdAt,
				subjectId: schema.subject.id,
				subjectNameTh: schema.subject.nameTh,
				authorNickname: schema.user.nickname,
			})
			.from(schema.subjectReview)
			.leftJoin(schema.subject, eq(schema.subject.id, schema.subjectReview.subjectId))
			.leftJoin(schema.user, eq(schema.user.id, schema.subjectReview.userId))
			.orderBy(desc(schema.subjectReview.createdAt), desc(schema.subjectReview.id))
			.limit(limit)
	})

const FEED_COLUMNS = {
	id: schema.subjectReview.id,
	review: schema.subjectReview.review,
	rating: schema.subjectReview.rating,
	likeCount: schema.subjectReview.likeCount,
	createdAt: schema.subjectReview.createdAt,
	subjectId: schema.subject.id,
	subjectNameTh: schema.subject.nameTh,
	authorNickname: schema.user.nickname,
}

/** Reviews feed with search (subject id/name), min-rating filter, and sort. */
export const listReviews = createServerFn({ method: 'GET' })
	.inputValidator(
		z.object({
			search: z.string().trim().optional(),
			sort: z.enum(['latest', 'popular', 'rating']).default('latest'),
			minRating: z.coerce.number().min(0).max(5).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(50),
		}),
	)
	.handler(async ({ data }) => {
		const like = `%${data.search ?? ''}%`
		const searchCond = data.search
			? sql`(${schema.subject.nameTh} ILIKE ${like} OR ${schema.subject.id} ILIKE ${like})`
			: undefined
		const ratingCond = data.minRating
			? sql`${schema.subjectReview.rating} >= ${data.minRating}`
			: undefined
		const order =
			data.sort === 'popular'
				? desc(schema.subjectReview.likeCount)
				: data.sort === 'rating'
					? desc(schema.subjectReview.rating)
					: desc(schema.subjectReview.createdAt)

		return db
			.select(FEED_COLUMNS)
			.from(schema.subjectReview)
			.leftJoin(schema.subject, eq(schema.subject.id, schema.subjectReview.subjectId))
			.leftJoin(schema.user, eq(schema.user.id, schema.subjectReview.userId))
			.where(and(searchCond, ratingCond))
			.orderBy(order, desc(schema.subjectReview.id))
			.limit(data.limit)
	})

/** Reviews for subjects in the signed-in user's curriculum (its group tree). */
export const listCurriculumReviews = createServerFn({ method: 'GET' }).handler(async () => {
	const { requireUser } = await import('./auth.server')
	const user = await requireUser()
	if (!user.curriculumId) return []

	const [curriculum] = await db
		.select({ groupId: schema.curriculum.groupId })
		.from(schema.curriculum)
		.where(eq(schema.curriculum.id, user.curriculumId))
		.limit(1)
	if (!curriculum?.groupId) return []

	// Collect every group id in the curriculum's tree, then its linked subjects.
	const groupIds = [curriculum.groupId]
	let frontier = [curriculum.groupId]
	while (frontier.length) {
		const children = await db
			.select({ id: schema.curriculumGroup.id })
			.from(schema.curriculumGroup)
			.where(inArray(schema.curriculumGroup.parentId, frontier))
		if (!children.length) break
		const ids = children.map((c) => c.id)
		groupIds.push(...ids)
		frontier = ids
	}

	const links = await db
		.select({ subjectId: schema.curriculumGroupSubject.subjectId })
		.from(schema.curriculumGroupSubject)
		.where(inArray(schema.curriculumGroupSubject.groupId, groupIds))
	const subjectIds = [...new Set(links.map((l) => l.subjectId))]
	if (!subjectIds.length) return []

	return db
		.select(FEED_COLUMNS)
		.from(schema.subjectReview)
		.leftJoin(schema.subject, eq(schema.subject.id, schema.subjectReview.subjectId))
		.leftJoin(schema.user, eq(schema.user.id, schema.subjectReview.userId))
		.where(inArray(schema.subjectReview.subjectId, subjectIds))
		.orderBy(desc(schema.subjectReview.createdAt), desc(schema.subjectReview.id))
		.limit(100)
})

/** Whether the signed-in user may review a subject: needs a transcript and a
 *  completed (non-fail/withdraw/incomplete) record of that subject. */
export const getReviewEligibility = createServerFn({ method: 'GET' })
	.inputValidator((subjectId: string) => subjectId)
	.handler(async ({ data: subjectId }) => {
		const { readUser } = await import('./auth.server')
		const user = await readUser()
		if (!user) return { signedIn: false, hasTranscript: false, completed: false }

		const [transcript] = await db
			.select({ id: schema.transcript.id })
			.from(schema.transcript)
			.where(eq(schema.transcript.userId, user.id))
			.orderBy(desc(schema.transcript.createdAt))
			.limit(1)
		if (!transcript) return { signedIn: true, hasTranscript: false, completed: false }

		const rows = await db
			.select({ grade: schema.transcriptDetail.grade })
			.from(schema.transcriptDetail)
			.where(
				and(
					eq(schema.transcriptDetail.transcriptId, transcript.id),
					eq(schema.transcriptDetail.subjectId, subjectId),
				),
			)
		const completed = rows.some((r) => {
			const g = (r.grade ?? '').toUpperCase().trim()
			return g !== '' && !['F', 'U', 'W', 'X'].includes(g)
		})
		return { signedIn: true, hasTranscript: true, completed }
	})

/** Create or replace the signed-in user's review for a (subject, year, term). */
export const upsertReview = createServerFn({ method: 'POST' })
	.inputValidator(reviewSchema)
	.handler(async ({ data }) => {
		const { requireUser } = await import('./auth.server')
		const user = await requireUser()

		const [tt] = await db
			.select()
			.from(schema.teachtable)
			.where(and(eq(schema.teachtable.year, data.year), eq(schema.teachtable.term, data.term)))
			.limit(1)
		const teachtableId =
			tt?.id ??
			(
				await db.insert(schema.teachtable).values({ year: data.year, term: data.term }).returning()
			)[0]!.id

		// One review per (user, subject, teachtable): delete the old, insert fresh.
		await db
			.delete(schema.subjectReview)
			.where(
				and(
					eq(schema.subjectReview.userId, user.id),
					eq(schema.subjectReview.subjectId, data.subjectId),
					eq(schema.subjectReview.teachtableId, teachtableId),
				),
			)
		const [row] = await db
			.insert(schema.subjectReview)
			.values({
				userId: user.id,
				subjectId: data.subjectId,
				teachtableId,
				rating: data.rating,
				review: data.review,
			})
			.returning()
		return row
	})

export const deleteReview = createServerFn({ method: 'POST' })
	.inputValidator((reviewId: number) => reviewId)
	.handler(async ({ data: reviewId }) => {
		const { requireUser } = await import('./auth.server')
		const user = await requireUser()
		await db
			.delete(schema.subjectReview)
			.where(and(eq(schema.subjectReview.id, reviewId), eq(schema.subjectReview.userId, user.id)))
		return { ok: true }
	})

/** Toggle a like for the signed-in user; returns the new like count. */
export const toggleLike = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ reviewId: z.number().int() }))
	.handler(async ({ data: { reviewId } }) => {
		const { requireUser } = await import('./auth.server')
		const user = await requireUser()

		const [existing] = await db
			.select()
			.from(schema.subjectReviewLike)
			.where(
				and(
					eq(schema.subjectReviewLike.reviewId, reviewId),
					eq(schema.subjectReviewLike.userId, user.id),
				),
			)
			.limit(1)

		if (existing) {
			await db.delete(schema.subjectReviewLike).where(eq(schema.subjectReviewLike.id, existing.id))
		} else {
			await db.insert(schema.subjectReviewLike).values({ reviewId, userId: user.id })
		}

		const [{ likes } = { likes: 0 }] = await db
			.select({ likes: count() })
			.from(schema.subjectReviewLike)
			.where(eq(schema.subjectReviewLike.reviewId, reviewId))
		await db
			.update(schema.subjectReview)
			.set({ likeCount: likes })
			.where(eq(schema.subjectReview.id, reviewId))

		return { liked: !existing, likeCount: likes }
	})
