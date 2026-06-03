import { reviewSchema } from '@repo/core/schemas'
import { and, count, db, desc, eq, schema } from '@repo/db'
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
