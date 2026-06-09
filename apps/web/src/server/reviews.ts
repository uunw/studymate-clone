import type { SubjectReview } from '@repo/db'
import { createServerFn } from '~/lib/server-fn'

// TODO(phase 4): Firestore reviews collection (+ denormalized aggregates).

type ReviewForSubject = Pick<
	SubjectReview,
	'id' | 'review' | 'rating' | 'likeCount' | 'createdAt'
> & {
	year: number | null
	term: number | null
	authorNickname: string | null
	authorName: string | null
	authorId: string | null
}
export const listReviewsForSubject = createServerFn({ method: 'GET' })
	.inputValidator((id: string) => id)
	.handler(async (): Promise<ReviewForSubject[]> => [])

type FeedReview = Pick<SubjectReview, 'id' | 'review' | 'rating' | 'likeCount' | 'createdAt'> & {
	subjectId: string | null
	subjectNameTh: string | null
	authorNickname: string | null
}
export const listLatestReviews = createServerFn({ method: 'GET' })
	.inputValidator((limit?: number) => limit ?? 20)
	.handler(async (): Promise<FeedReview[]> => [])

export const listReviews = createServerFn({ method: 'GET' })
	.inputValidator((d: unknown) => d)
	.handler(async (): Promise<FeedReview[]> => [])

export const listCurriculumReviews = createServerFn({ method: 'GET' }).handler(
	async (): Promise<FeedReview[]> => [],
)

export const getReviewEligibility = createServerFn({ method: 'GET' })
	.inputValidator((id: string) => id)
	.handler(
		async (): Promise<{ signedIn: boolean; hasTranscript: boolean; completed: boolean }> => ({
			signedIn: false,
			hasTranscript: false,
			completed: false,
		}),
	)

export const upsertReview = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(async (): Promise<SubjectReview | undefined> => undefined)

export const deleteReview = createServerFn({ method: 'POST' })
	.inputValidator((reviewId: number) => reviewId)
	.handler(async (): Promise<{ ok: true }> => ({ ok: true }))

export const toggleLike = createServerFn({ method: 'POST' })
	.inputValidator((d: unknown) => d)
	.handler(
		async (): Promise<{ liked: boolean; likeCount: number }> => ({ liked: false, likeCount: 0 }),
	)
